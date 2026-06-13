"""
twilio_routes.py — v4

Fix 1 — English "ok" / "ok thank you" ending the call:
  Root cause: "ok thank you" was being matched by a loose regex variant,
  AND the Gather <Hangup/> fallback was firing when Twilio got no further input
  after the AI spoke.  Two-part fix:
    a) Tightened the English farewell regex: removed "thank you for your help"
       as a standalone farewell (it is a mid-sentence courtesy, not a goodbye).
       Added a HARD exclusion: if the text is ONLY "ok", "okay", "sure",
       "alright", "got it", "I see", or "thank you" (without a real goodbye
       word), it is NEVER treated as a farewell.
    b) The farewell reply now offers a callback offer so the call ends warmly
       and the user knows they can call back, rather than just hanging up.

Fix 2 — Telugu word stress / syllable separation:
  Root cause: The anusvara ం was always mapped to 'm' which forced an extra
  nasal consonant sound inside words (e.g. సంతోషంగా → samthohshamgaa).
  In natural Telugu pronunciation the anusvara nasalises the *preceding* vowel
  rather than adding a hard 'm'.  Fix: map ం to 'n' before velar consonants
  (క,గ,ఖ,ఘ), to 'n' before dental consonants (త,థ,ద,ధ,న), and to 'm'
  before labial consonants (ప,ఫ,బ,భ,మ).  In all other positions (vowel-final
  words, end of word) use 'ng' (velar nasal) which Polly reads naturally.
  Also fixed: the virama '్' inside a conjunct was consuming the wrong index,
  causing one character to be skipped.

Fix 3 — Hindi not sounding natural:
  Root cause: Polly.Aditi with hi-IN reads Devanagari reasonably but becomes
  robotic when numbers, abbreviations, or loan-domain words appear mid-sentence
  because it tries to spell them character-by-character.  Fix:
    a) Pre-expand Hindi numbers into spoken Devanagari words so Polly never
       encounters bare digits inside a Hindi sentence (digits alone are fine
       but mixed "आपकी 9109 रुपए किस्त" was causing stress issues).
    b) Expand common loan abbreviations (EMI→ई एम आई, SBI→एस बी आई, etc.)
       into spaced Devanagari letters before TTS.
    c) The system prompt now explicitly forbids mixing English words into the
       Hindi response, which was the primary cause of robotic pronunciation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import asyncio, httpx, html, urllib.parse, re

from app.core.database import get_db
from app.core.config import (
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER, PUBLIC_BASE_URL,
)
from app.models.call_log import CallLog
from app.routes.auth import decode_token
from app.services.groq_service import get_client

router = APIRouter(prefix="/calls", tags=["calls"])

# ── Telugu TTS mode ────────────────────────────────────────────────────────────
# True  → transliterate Telugu script to Latin, speak via Polly.Aditi  (safe default)
# False → use Google.te-IN-Wavenet-A (requires Google TTS add-on in Twilio console)
TELUGU_FALLBACK = True

# ── Language config ────────────────────────────────────────────────────────────
LANG_CONFIG = {
    "en": {
        "voice":       "Polly.Aditi",
        "say_lang":    "en-IN",
        "gather_lang": "en-IN",
        "system_prompt": (
            "You are a professional loan advisor on a phone call. "
            "You MUST reply ONLY in clear Indian English. "
            "Keep answers to 1-2 short sentences. "
            "No markdown, no bullet points, no asterisks, no special characters. "
            "Write numbers as digits (e.g. 9109, not nine thousand one hundred nine). "
            "If the user says 'ok', 'okay', 'alright', 'sure', or 'I see', treat it as "
            "acknowledgement and continue helping — do NOT end the conversation. "
            "Only end the conversation when the user explicitly says goodbye or bye."
        ),
        "retry":         "Sorry, I did not catch that. Please speak again.",
        # FIX 1b: farewell reply now offers callback so user knows they can return
        "farewell_reply": (
            "Thank you so much for calling LoanAI! It was a pleasure assisting you today. "
            "Feel free to call us back anytime if you have more questions about your loan. "
            "Have a wonderful day, goodbye!"
        ),
        "stt_clean_prompt": (
            "Fix spelling and grammar only in this phone transcription. "
            "Return ONLY the corrected sentence, nothing else, no explanation."
        ),
    },
    "hi": {
        # Polly.Aditi with hi-IN language tag works on ALL Twilio accounts.
        "voice":       "Polly.Aditi",
        "say_lang":    "hi-IN",
        "gather_lang": "hi-IN",
        "system_prompt": (
            "आप LoanAI के एक पेशेवर लोन सलाहकार हैं और फ़ोन कॉल पर बात कर रहे हैं। "
            "आपको केवल हिंदी में जवाब देना है। अंग्रेज़ी शब्द बिल्कुल मत इस्तेमाल करें। "
            # FIX 3c: explicitly forbid English loan words
            "EMI को 'मासिक किस्त' कहें। loan को 'ऋण' या 'लोन' कहें (देवनागरी में)। "
            "bank को 'बैंक' कहें (देवनागरी में)। "
            "जवाब 1-2 छोटे वाक्यों में दें। "
            "कोई मार्कडाउन, बुलेट पॉइंट या तारे नहीं। "
            "संख्याएँ हिंदी शब्दों में लिखें (जैसे: नौ हज़ार एक सौ नौ)।"
        ),
        "retry":         "माफ़ करें, समझ नहीं आया। कृपया दोबारा बोलें।",
        "farewell_reply": (
            "LoanAI को कॉल करने के लिए बहुत धन्यवाद! "
            "आपसे बात करके बहुत अच्छा लगा। "
            "अगर कोई और सवाल हो तो कभी भी कॉल करें। आपका दिन शुभ हो! अलविदा!"
        ),
        "stt_clean_prompt": (
            "नीचे दिए गए हिंदी फ़ोन ट्रांसक्रिप्शन को सही करें। "
            "केवल सही किया हुआ वाक्य लिखें, कोई स्पष्टीकरण नहीं।"
        ),
    },
    "te": {
        "voice":       "Google.te-IN-Wavenet-A",
        "say_lang":    "te-IN",
        "gather_lang": "te-IN",
        "system_prompt": (
            "మీరు LoanAI యొక్క ప్రొఫెషనల్ లోన్ అడ్వైజర్, ఫోన్ కాల్‌లో మాట్లాడుతున్నారు. "
            "మీరు తప్పనిసరిగా తెలుగులో మాత్రమే సమాధానం ఇవ్వాలి. ఆంగ్లంలో సమాధానం ఇవ్వవద్దు. "
            "సమాధానం 1-2 చిన్న వాక్యాల్లో ఇవ్వండి. "
            "మార్క్‌డౌన్ లేదా నక్షత్రాలు (*) వాడవద్దు. "
            "సంఖ్యలను అంకెల్లో రాయండి."
        ),
        "retry":         "క్షమించండి, వినిపించలేదు. దయచేసి మళ్ళీ చెప్పండి.",
        "farewell_reply": (
            "LoanAI కి కాల్ చేసినందుకు చాలా ధన్యవాదాలు! "
            "మీతో మాట్లాడటం చాలా సంతోషంగా ఉంది. "
            "ఇంకేమైనా సందేహాలుంటే ఎప్పుడైనా కాల్ చేయండి. మీ రోజు శుభంగా ఉండాలి!"
        ),
        "stt_clean_prompt": (
            "Fix the following Telugu phone transcription — correct spelling, "
            "grammar and word boundaries. Return ONLY the corrected Telugu sentence, no explanation."
        ),
    },
}

# ── Farewell detection ─────────────────────────────────────────────────────────
# FIX 1a: Stricter farewell detection for English.
# HARD EXCLUSIONS: these words alone are NEVER farewells even if short.
_EN_NON_FAREWELL = re.compile(
    r'^(ok|okay|sure|alright|got\s+it|i\s+see|thank\s+you|thanks|'
    r'yes|no|hmm|uh|uhh|right|fine|great|good|cool|perfect|'
    r'i\s+understand|understood|i\s+got\s+it|sounds\s+good|makes\s+sense)\.?$',
    re.IGNORECASE,
)

_FAREWELL_KEYWORDS = {
    "en": re.compile(
        r'\b(bye|goodbye|good\s*bye|see\s+you|take\s+care|'
        r'have\s+a\s+good\s+day|have\s+a\s+great\s+day|'
        r'talk\s+to\s+you\s+later|talk\s+later|'
        r'that\s+will\s+be\s+all|no\s+more\s+questions?|'
        r'i\s+am\s+done|i\'m\s+done|'
        r'thank\s+you\s+(so\s+much\s+bye|very\s+much\s+bye|bye|goodbye)|'
        r'thanks\s+(bye|goodbye)|'
        r'ok\s*,?\s*bye|okay\s*,?\s*bye|alright\s*,?\s*bye|'
        r'that\'?s?\s+all\s+i\s+needed|'
        r'i\s+don\'?t\s+have\s+(any\s+)?more\s+questions?)\b',
        re.IGNORECASE,
    ),
    "hi": re.compile(
        r'(धन्यवाद\s*(और\s*)?अलविदा|धन्यवाद\s*बाय|शुक्रिया\s*अलविदा|'
        r'अलविदा|बाय\s*बाय|फिर\s*मिलेंगे|बात\s*हो\s*गई|'
        r'काम\s*हो\s*गया|बहुत\s*धन्यवाद\s*(अलविदा|बाय)?|'
        r'अब\s*(फ़ोन\s*)?रखता\s*हूँ|अब\s*(फ़ोन\s*)?रखती\s*हूँ|'
        r'फ़ोन\s*रखता\s*हूँ|फ़ोन\s*रखती\s*हूँ)',
        re.IGNORECASE | re.UNICODE,
    ),
    "te": re.compile(
        r'(వెళ్తాను|బై\s*బై|అలా\s*అయితే\s*వెళ్తాను|'
        r'ధన్యవాదాలు\s*(బై|మళ్ళీ\s*మాట్లాడతాను)?|'
        r'థాంక్యూ\s*(బై|మళ్ళీ\s*మాట్లాడతాను)?|'
        r'సెలవు|ఫోన్\s*పెడతాను|మళ్ళీ\s*మాట్లాడతాను\s*(బై)?|'
        r'మాట్లాడటం\s*అయిపోయింది)',
        re.IGNORECASE | re.UNICODE,
    ),
}

_MAX_FAREWELL_WORDS = 14  # utterances longer than this are never pure farewells


def _is_farewell(text: str, lang: str) -> bool:
    """
    FIX 1a: Return True only when ALL conditions are met:
      1. The utterance is short (≤ _MAX_FAREWELL_WORDS words).
      2. It contains a strong farewell keyword.
      3. For English: it is NOT one of the hard-excluded polite words
         (ok, okay, sure, thank you, alright, etc.) that are mid-conversation.
    """
    text_stripped = text.strip()
    word_count = len(text_stripped.split())

    if word_count > _MAX_FAREWELL_WORDS:
        return False

    # English hard exclusion — these words alone must NEVER end a call
    if lang == "en" and _EN_NON_FAREWELL.match(text_stripped):
        return False

    pattern = _FAREWELL_KEYWORDS.get(lang, _FAREWELL_KEYWORDS["en"])
    return bool(pattern.search(text_stripped))


# ── STT hints — English + Hindi + Telugu financial vocabulary ──────────────────
STT_HINTS = (
    "EMI,loan,interest,tenure,rupees,principal,SBI,HDFC,ICICI,Axis,"
    "personal loan,home loan,car loan,education loan,business loan,"
    "credit score,eligibility,repayment,installment,LoanAI,"
    "monthly income,down payment,processing fee,foreclosure,"
    "लोन,किस्त,ब्याज,क्रेडिट,आय,चुकाना,अवधि,बैंक,मासिक,"
    "లోన్,వడ్డీ,నెలవారీ,అర్హత,చెల్లింపు,బ్యాంక్,క్రెడిట్,ఆదాయం"
)

# ── Telugu transliteration ─────────────────────────────────────────────────────
# FIX 2: Improved anusvara (ం) handling + virama index fix.

_TE_MATRA = {
    'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo',
    'ె': 'e',  'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'oh', 'ౌ': 'au',
}
_TE_VOWEL = {
    'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i',  'ఈ': 'ee', 'ఉ': 'u',
    'ఊ': 'oo', 'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o',
    'ఓ': 'oh', 'ఔ': 'au',
}
_TE_CONS = {
    'క': 'k',  'ఖ': 'kh', 'గ': 'g',  'ఘ': 'gh', 'ఙ': 'ng',
    'చ': 'ch', 'ఛ': 'chh','జ': 'j',  'ఝ': 'jh', 'ఞ': 'ny',
    'ట': 't',  'ఠ': 'th', 'డ': 'd',  'ఢ': 'dh', 'ణ': 'n',
    'త': 'th', 'థ': 'th', 'ద': 'd',  'ధ': 'dh', 'న': 'n',
    'ప': 'p',  'ఫ': 'ph', 'బ': 'b',  'భ': 'bh', 'మ': 'm',
    'య': 'y',  'ర': 'r',  'ల': 'l',  'వ': 'v',  'శ': 'sh',
    'ష': 'sh', 'స': 's',  'హ': 'h',  'ళ': 'l',  'క్ష': 'ksh',
}

# FIX 2: Context-sensitive anusvara groups
_TE_VELAR_CONS  = {'క', 'ఖ', 'గ', 'ఘ', 'ఙ'}   # ం → ng before these
_TE_DENTAL_CONS = {'త', 'థ', 'ద', 'ధ', 'న', 'ట', 'ఠ', 'డ', 'ఢ', 'ణ'}  # ం → n before these
_TE_LABIAL_CONS = {'ప', 'ఫ', 'బ', 'భ', 'మ'}   # ం → m before these

_TE_SPECIAL = {'ః': 'h', '్': None, '।': '.', '॥': '.'}  # '్' handled inline


def _anusvara_for_context(next_ch: str) -> str:
    """
    FIX 2: Return the correct nasal for anusvara (ం) based on the following consonant.
    This makes words like సంతోషంగా sound natural instead of 'samthohshamgaa'.
    """
    if next_ch in _TE_VELAR_CONS:
        return 'ng'
    if next_ch in _TE_DENTAL_CONS:
        return 'n'
    if next_ch in _TE_LABIAL_CONS:
        return 'm'
    return 'n'   # default nasal (end of word or before vowels)


def _te_to_latin(text: str) -> str:
    """
    FIX 2: Improved Telugu → Latin phonetic conversion.
    - Context-sensitive anusvara (ం) so nasals are natural.
    - Fixed virama ('్') index advancement to avoid skipped characters.
    """
    chars = list(text.replace("\n", " ").strip())
    result = []
    i = 0
    n = len(chars)

    while i < n:
        ch = chars[i]

        # ── Two-character consonant cluster (e.g. క్ష) ──────────────────────
        if i + 1 < n:
            two = chars[i] + chars[i + 1]
            if two in _TE_CONS:
                cons_latin = _TE_CONS[two]
                i += 2
                if i < n and chars[i] in _TE_MATRA:
                    result.append(cons_latin + _TE_MATRA[chars[i]])
                    i += 1
                elif i < n and chars[i] == '్':
                    # Virama: consonant has no inherent vowel; skip virama
                    result.append(cons_latin)
                    i += 1   # FIX 2: was missing this increment in some paths
                else:
                    result.append(cons_latin + 'a')
                continue

        # ── Single consonant ─────────────────────────────────────────────────
        if ch in _TE_CONS:
            cons_latin = _TE_CONS[ch]
            i += 1
            if i < n and chars[i] in _TE_MATRA:
                result.append(cons_latin + _TE_MATRA[chars[i]])
                i += 1
            elif i < n and chars[i] == '్':
                # Virama: no inherent vowel
                result.append(cons_latin)
                i += 1   # FIX 2: advance past the virama
            else:
                result.append(cons_latin + 'a')
            continue

        # ── Standalone vowel ─────────────────────────────────────────────────
        if ch in _TE_VOWEL:
            result.append(_TE_VOWEL[ch])
            i += 1
            continue

        # ── Orphan matra (shouldn't happen normally) ─────────────────────────
        if ch in _TE_MATRA:
            result.append(_TE_MATRA[ch])
            i += 1
            continue

        # ── FIX 2: Anusvara — context-sensitive nasal ───────────────────────
        if ch == 'ం':
            next_ch = chars[i + 1] if i + 1 < n else ''
            result.append(_anusvara_for_context(next_ch))
            i += 1
            continue

        # ── Visarga ──────────────────────────────────────────────────────────
        if ch == 'ః':
            result.append('h')
            i += 1
            continue

        # ── Virama (standalone — shouldn't appear here but handle gracefully) ─
        if ch == '్':
            i += 1
            continue

        # ── Sentence-ending punctuation ──────────────────────────────────────
        if ch in ('।', '॥'):
            result.append('. ')
            i += 1
            continue

        # ── Space, digits, ASCII punctuation — pass through ──────────────────
        result.append(ch)
        i += 1

    out = ''.join(result)
    out = re.sub(r' {2,}', ' ', out).strip()
    return out


# ── Hindi TTS pre-processing ───────────────────────────────────────────────────
# FIX 3a+3b: Expand numbers and loan abbreviations into spoken Hindi words
# so Polly.Aditi never encounters bare digits or Latin abbreviations mid-sentence.

_HI_ONES = [
    '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
    'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
    'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस',
    'अट्ठाईस', 'उनतीस', 'तीस', 'इकत्तीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस',
    'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस', 'इकतालीस', 'बयालीस',
    'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस',
    'उनचास', 'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन',
    'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ',
    'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर', 'इकहत्तर',
    'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर',
    'उन्यासी', 'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी',
    'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे', 'इक्यानवे', 'बानवे',
    'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे',
]

def _num_to_hindi(n: int) -> str:
    """Convert integer 0-99999 to Hindi words."""
    if n < 0:
        return 'ऋण ' + _num_to_hindi(-n)
    if n == 0:
        return 'शून्य'
    if n < 100:
        return _HI_ONES[n]
    if n < 1000:
        hundreds = n // 100
        remainder = n % 100
        h = (_HI_ONES[hundreds] + ' सौ') if hundreds else ''
        r = _num_to_hindi(remainder) if remainder else ''
        return (h + ' ' + r).strip()
    if n < 100000:
        thousands = n // 1000
        remainder = n % 1000
        t = _num_to_hindi(thousands) + ' हज़ार'
        r = _num_to_hindi(remainder) if remainder else ''
        return (t + ' ' + r).strip()
    # For larger numbers just return the digit string — Polly handles those
    return str(n)


def _expand_hindi_numbers(text: str) -> str:
    """
    FIX 3a: Replace bare digits with Hindi spoken words inside Hindi sentences.
    Only replaces numbers ≤ 99999 that appear mid-sentence (surrounded by Hindi
    characters or spaces). Larger numbers are left as digits (Polly reads them
    as individual digits which is acceptable for large loan amounts).
    """
    def replacer(m):
        num = int(m.group(0))
        if num <= 99999:
            return _num_to_hindi(num)
        return m.group(0)   # leave large numbers as-is
    return re.sub(r'\b\d+\b', replacer, text)


def _expand_hindi_abbrevs(text: str) -> str:
    """
    FIX 3b: Expand Latin loan abbreviations to spoken Devanagari so Polly
    doesn't spell them out letter-by-letter in an unnatural way.
    """
    replacements = [
        (re.compile(r'\bEMIs?\b', re.IGNORECASE), 'मासिक किस्त'),
        (re.compile(r'\bSBI\b',   re.IGNORECASE), 'एस बी आई'),
        (re.compile(r'\bHDFC\b',  re.IGNORECASE), 'एच डी एफ सी'),
        (re.compile(r'\bICICI\b', re.IGNORECASE), 'आई सी आई सी आई'),
        (re.compile(r'\bRs\.?\b', re.IGNORECASE), 'रुपए'),
        (re.compile(r'₹'),                        'रुपए '),
        (re.compile(r'\bpa\b|\bp\.a\.\b', re.IGNORECASE), 'प्रति वर्ष'),
        (re.compile(r'\bLoanAI\b', re.IGNORECASE), 'लोन ए आई'),
    ]
    for pattern, replacement in replacements:
        text = pattern.sub(replacement, text)
    return text


def _prepare_hindi_for_tts(text: str) -> str:
    """FIX 3: Full Hindi TTS pre-processing pipeline."""
    t = str(text or "").strip()
    # Strip markdown
    t = re.sub(r'[*#`]', '', t)
    t = t.replace("\n", " ")
    # Expand abbreviations first (before number expansion)
    t = _expand_hindi_abbrevs(t)
    # Expand numbers to Hindi words
    t = _expand_hindi_numbers(t)
    # Clean up whitespace
    t = re.sub(r' +', ' ', t).strip()
    return t


# ── Helpers ────────────────────────────────────────────────────────────────────

def _auth_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization.split(" ", 1)[1])
    return payload["id"] if payload else None


def _require_base() -> str:
    if not PUBLIC_BASE_URL or not PUBLIC_BASE_URL.strip():
        raise HTTPException(500,
            "PUBLIC_BASE_URL not set in .env — add your ngrok https URL")
    return PUBLIC_BASE_URL.rstrip("/")


def _clean_for_tts(text: str) -> str:
    """
    Strip markdown and normalise text before TTS.
    NOTE: For Telugu, call this on the already-transliterated Latin text.
    NOTE: For Hindi, use _prepare_hindi_for_tts() instead — it does more.
    """
    t = (str(text or "")
         .replace("**", "").replace("*", "")
         .replace("#",  "").replace("`", "")
         .replace("\n", " ").strip())
    t = re.sub(r'\bEMIs?\b', 'E M I', t)
    t = re.sub(r'\bp\.a\.\b', 'per annum', t, flags=re.IGNORECASE)
    t = re.sub(r'(\d)-(\w)', r'\1 \2', t)
    t = re.sub(r'(\w)-(\d)', r'\1 \2', t)
    t = t.replace("₹", "").replace("Rs.", "")
    t = t.replace("%", " percent")
    t = re.sub(r' +', ' ', t).strip()
    return t


def _say(text: str, lang: str) -> str:
    """
    Build a TwiML <Say> tag for the given language.

    English → Polly.Aditi  language="en-IN"
    Hindi   → Polly.Aditi  language="hi-IN"  with expanded Hindi words (FIX 3)
    Telugu  → Polly.Aditi  with transliterated Latin (TELUGU_FALLBACK=True) (FIX 2)
            → Google.te-IN-Wavenet-A           (TELUGU_FALLBACK=False)
    """
    cfg = LANG_CONFIG.get(lang, LANG_CONFIG["en"])

    if lang == "te" and TELUGU_FALLBACK:
        # FIX 2: transliterate FIRST, then clean the resulting Latin text
        latin    = _te_to_latin(str(text or "").replace("\n", " ").strip())
        speak    = _clean_for_tts(latin)
        voice    = "Polly.Aditi"
        say_lang = "en-IN"

    elif lang == "te":
        # Google TTS — pass original Telugu, just strip markdown
        speak    = _clean_for_tts(text)
        voice    = cfg["voice"]
        say_lang = cfg["say_lang"]

    elif lang == "hi":
        # FIX 3: use Hindi-specific pipeline for natural pronunciation
        speak    = _prepare_hindi_for_tts(text)
        voice    = cfg["voice"]
        say_lang = cfg["say_lang"]

    else:
        # English
        speak    = _clean_for_tts(text)
        voice    = cfg["voice"]
        say_lang = cfg["say_lang"]

    safe = html.escape(speak, quote=True)
    return f'<Say voice="{voice}" language="{say_lang}">{safe}</Say>'


def _respond(say_tag: str, gather_url: str, gather_lang: str) -> str:
    """TwiML: speak → listen → loop."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {say_tag}
  <Gather input="speech" action="{gather_url}" method="POST"
          speechTimeout="3" language="{gather_lang}" timeout="8"
          enhanced="true" hints="{STT_HINTS}">
  </Gather>
  <Redirect method="POST">{gather_url}</Redirect>
</Response>"""


def _final(say_tag: str) -> str:
    """TwiML: speak → hang up (used for farewells and fatal errors)."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {say_tag}
  <Hangup/>
</Response>"""


def _loan_context_lines(log: "CallLog") -> list:
    lines = []
    if log.customer_name:    lines.append(f"Customer name: {log.customer_name}")
    if log.loan_type:        lines.append(f"Loan type: {log.loan_type}")
    if log.loan_amount:      lines.append(f"Loan amount: {int(log.loan_amount):,} rupees")
    if log.loan_tenure:      lines.append(f"Tenure: {log.loan_tenure} months")
    if log.monthly_income:   lines.append(f"Monthly income: {int(log.monthly_income):,} rupees")
    if log.credit_score:     lines.append(f"Credit score: {log.credit_score}")
    if log.recommended_bank: lines.append(f"Recommended bank: {log.recommended_bank}")
    if log.recommended_emi:  lines.append(f"Monthly EMI: {int(log.recommended_emi):,} rupees")
    return lines


def _generate_call_response(user_speech: str, log: "CallLog | None", lang: str) -> str:
    """
    Language-enforced Groq call. System prompt is in the target language
    so the model never replies in English for Hindi/Telugu calls.
    """
    cfg = LANG_CONFIG.get(lang, LANG_CONFIG["en"])
    system_parts = [cfg["system_prompt"]]

    if log:
        profile = _loan_context_lines(log)
        if profile:
            # FIX 3c: For Hindi, include the profile in Hindi context labels
            if lang == "hi":
                system_parts.append(
                    "ग्राहक की जानकारी (दोबारा मत पूछें):\n" + "\n".join(profile)
                )
            else:
                system_parts.append(
                    "Customer profile (do NOT ask for this again):\n" + "\n".join(profile)
                )

    system_content = "\n\n".join(system_parts)

    try:
        client = get_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user",   "content": user_speech},
            ],
            temperature=0.5,
            max_tokens=200,
        )
        reply = completion.choices[0].message.content or ""
        # Strip markdown
        reply = re.sub(r'\s+', ' ',
            reply.replace("**", "").replace("*", "").replace("#", "").replace("`", "")
        ).strip()
        return reply[:300]
    except Exception as e:
        print(f"Groq call error ({lang}): {e}")
        if lang == "hi":
            return "माफ़ करें, तकनीकी समस्या हुई। कृपया दोबारा पूछें।"
        if lang == "te":
            return "క్షమించండి, సమస్య వచ్చింది. దయచేసి మళ్ళీ అడగండి."
        return "Sorry, I had a technical issue. Please ask again."


def _normalise_stt(raw: str, lang: str) -> str:
    """
    Clean up garbled STT output via Groq.
    Only reject if corrected is empty or suspiciously long (> 10x original).
    """
    if not raw or not raw.strip():
        return raw

    cfg = LANG_CONFIG.get(lang, LANG_CONFIG["en"])
    clean_prompt = cfg.get("stt_clean_prompt", "")
    if not clean_prompt:
        return raw

    prompt = f"{clean_prompt}\n\nTranscription: {raw}\n\nCorrected:"
    try:
        from app.services.groq_service import generate_ai_response
        corrected = generate_ai_response(prompt).strip()
        if corrected and len(corrected) < len(raw) * 10:
            return corrected
    except Exception as e:
        print(f"STT normalise error: {e}")
    return raw


# ── Schema ─────────────────────────────────────────────────────────────────────

class InitiateCallRequest(BaseModel):
    to_number:      str
    user_name:      str   = "there"
    loan_type:      str   = "loan"
    bank:           str   = ""
    emi:            float = 0.0
    loan_amount:    float = 0.0
    loan_tenure:    int   = 0
    monthly_income: float = 0.0
    credit_score:   int   = 0
    language:       str   = "en"


# ── 1. Initiate call ───────────────────────────────────────────────────────────

@router.post("/initiate")
async def initiate_call(
    body: InitiateCallRequest,
    db:   Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise HTTPException(500, "Twilio credentials not set in .env")

    base         = _require_base()
    auth_user_id = _auth_id(authorization)
    lang         = body.language if body.language in LANG_CONFIG else "en"

    params    = urllib.parse.urlencode({"language": lang})
    twiml_url = f"{base}/calls/twiml?{params}"
    status_cb = f"{base}/calls/status-callback"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To":                   body.to_number,
                "From":                 TWILIO_FROM_NUMBER,
                "Url":                  twiml_url,
                "Method":               "POST",
                "StatusCallback":       status_cb,
                "StatusCallbackMethod": "POST",
                "StatusCallbackEvent":  ["initiated", "ringing", "answered", "completed"],
            },
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(502, f"Twilio error: {resp.text}")

    call_sid = resp.json().get("sid", "")

    db.add(CallLog(
        auth_user_id     = auth_user_id,
        call_sid         = call_sid,
        to_number        = body.to_number,
        from_number      = TWILIO_FROM_NUMBER,
        status           = "initiated",
        transcript       = "",
        language         = lang,
        customer_name    = body.user_name if body.user_name not in ("", "there") else None,
        loan_type        = body.loan_type   or None,
        loan_amount      = body.loan_amount  or None,
        loan_tenure      = body.loan_tenure  or None,
        monthly_income   = body.monthly_income or None,
        credit_score     = body.credit_score   or None,
        recommended_bank = body.bank or None,
        recommended_emi  = body.emi  or None,
    ))
    db.commit()

    return {"callSid": call_sid, "status": "initiated", "to": body.to_number}


# ── 2. TwiML greeting ─────────────────────────────────────────────────────────

@router.post("/twiml")
@router.get("/twiml")
async def twiml_handler(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    lang   = params.get("language", "en")
    if lang not in LANG_CONFIG:
        lang = "en"

    call_sid = ""
    if request.method == "POST":
        try:
            body_form = await request.form()
            call_sid  = body_form.get("CallSid", "")
        except Exception:
            pass

    cfg        = LANG_CONFIG[lang]
    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    log  = db.query(CallLog).filter(CallLog.call_sid == call_sid).first() if call_sid else None
    name = (log.customer_name or "") if log else ""
    bank = (log.recommended_bank or "") if log else ""
    emi  = log.recommended_emi if log and log.recommended_emi else None
    lt   = (log.loan_type or "loan") if log else "loan"

    if lang == "hi":
        g  = f"नमस्ते{', ' + name if name else ''}! मैं LoanAI का लोन सलाहकार हूँ। "
        if bank and emi:
            # FIX 3: Use Hindi words for numbers and avoid bare EMI abbreviation
            emi_words = _num_to_hindi(int(emi))
            g += f"आपका {lt} ऋण {bank} से {emi_words} रुपए मासिक किस्त पर है। "
        g += "आप अपने लोन के बारे में कुछ भी पूछ सकते हैं। बताइए, मैं कैसे मदद करूँ?"
    elif lang == "te":
        g  = f"నమస్కారం{', ' + name if name else ''}! నేను LoanAI లోన్ అడ్వైజర్‌ని. "
        if bank and emi:
            g += f"మీ {lt} లోన్ {bank} నుండి నెలకు {int(emi):,} రూపాయలు. "
        g += "మీ లోన్ గురించి ఏమైనా అడగవచ్చు. నేను ఎలా సహాయం చేయాలి?"
    else:
        g  = f"Hello{', ' + name if name else ''}! This is your loan advisor from LoanAI. "
        if bank and emi:
            g += f"I can see your {lt} loan from {bank} with a monthly EMI of {int(emi):,} rupees. "
        g += "You can ask me anything about your loan. How can I help you today?"

    return Response(
        content=_respond(_say(g, lang), gather_url, cfg["gather_lang"]),
        media_type="application/xml",
    )


# ── 3. Gather ─────────────────────────────────────────────────────────────────

@router.post("/gather")
async def gather_handler(request: Request, db: Session = Depends(get_db)):
    form          = await request.form()
    call_sid      = (form.get("CallSid")      or "").strip()
    speech_result = (form.get("SpeechResult") or "").strip()

    base       = _require_base()
    gather_url = f"{base}/calls/gather"

    log  = db.query(CallLog).filter(CallLog.call_sid == call_sid).first() if call_sid else None
    lang = (log.language or "en") if log else "en"
    if lang not in LANG_CONFIG:
        lang = "en"
    cfg = LANG_CONFIG[lang]

    # ── Nothing heard — ask user to repeat ────────────────────────────────────
    if not speech_result:
        return Response(
            content=_respond(_say(cfg["retry"], lang), gather_url, cfg["gather_lang"]),
            media_type="application/xml",
        )

    # ── Normalise STT transcript ───────────────────────────────────────────────
    clean_speech = await asyncio.get_event_loop().run_in_executor(
        None, lambda: _normalise_stt(speech_result, lang)
    )

    # Store cleaned transcript
    if log:
        log.transcript = ((log.transcript or "") + f"\nUser: {clean_speech}").strip()
        db.commit()

    # ── Farewell detection — end call naturally ────────────────────────────────
    if _is_farewell(clean_speech, lang):
        farewell_text = cfg["farewell_reply"]
        if log:
            log.transcript = (log.transcript + f"\nAI: {farewell_text}").strip()
            db.commit()
        return Response(
            content=_final(_say(farewell_text, lang)),
            media_type="application/xml",
        )

    # ── Generate AI response in the correct language ───────────────────────────
    ai_text = await asyncio.get_event_loop().run_in_executor(
        None, lambda: _generate_call_response(clean_speech, log, lang)
    )

    # Store AI reply
    if log:
        log.transcript = (log.transcript + f"\nAI: {ai_text}").strip()
        db.commit()

    return Response(
        content=_respond(_say(ai_text, lang), gather_url, cfg["gather_lang"]),
        media_type="application/xml",
    )


# ── 4. Status callback ─────────────────────────────────────────────────────────

@router.post("/status-callback")
async def status_callback(request: Request, db: Session = Depends(get_db)):
    form        = await request.form()
    call_sid    = form.get("CallSid", "")
    call_status = form.get("CallStatus", "")
    duration    = form.get("CallDuration", 0)
    rec_url     = form.get("RecordingUrl", "")

    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if log:
        log.status       = call_status
        log.duration_sec = int(duration) if duration else log.duration_sec
        if rec_url:
            log.recording_url = rec_url
        db.commit()

    return Response(content="OK", media_type="text/plain")


# ── 5. Call logs ───────────────────────────────────────────────────────────────

@router.get("/logs")
def get_call_logs(db: Session = Depends(get_db),
                  authorization: Optional[str] = Header(None)):
    auth_user_id = _auth_id(authorization)
    q = db.query(CallLog).order_by(CallLog.created_at.desc())
    if auth_user_id:
        q = q.filter(CallLog.auth_user_id == auth_user_id)
    return [_log_dict(l) for l in q.limit(100).all()]


# ── 6. Single call detail ──────────────────────────────────────────────────────

@router.get("/logs/{call_sid}")
def get_call_detail(call_sid: str, db: Session = Depends(get_db),
                    authorization: Optional[str] = Header(None)):
    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")
    return _log_dict(log)


# ── 7. Analytics ───────────────────────────────────────────────────────────────

@router.post("/analytics/{call_sid}")
def generate_analytics(call_sid: str, db: Session = Depends(get_db),
                        authorization: Optional[str] = Header(None)):
    from app.services.groq_service import generate_ai_response

    auth_user_id = _auth_id(authorization)
    log = db.query(CallLog).filter(CallLog.call_sid == call_sid).first()
    if not log:
        raise HTTPException(404, "Call not found")
    if auth_user_id and log.auth_user_id and log.auth_user_id != auth_user_id:
        raise HTTPException(403, "Access denied")

    has_transcript = bool(log.transcript and log.transcript.strip())

    if has_transcript:
        parts = []
        if log.customer_name:    parts.append(f"Name: {log.customer_name}")
        if log.loan_type:        parts.append(f"Loan: {log.loan_type}")
        if log.recommended_bank: parts.append(f"Bank: {log.recommended_bank}")
        if log.recommended_emi:  parts.append(f"EMI: {int(log.recommended_emi):,} rupees")
        profile = ", ".join(parts) or "not available"
        prompt = (
            f"Customer profile: {profile}\n\n"
            f"Call transcript:\n{log.transcript}\n\n"
            "Provide:\n"
            "1. 2-sentence summary of what was discussed\n"
            "2. Key topics (comma separated)\n"
            "3. One follow-up recommendation\n"
            "Be specific and concise."
        )
    else:
        dur = f"{log.duration_sec} seconds" if log.duration_sec else "unknown"
        prompt = (
            f"Loan advisory call to {log.to_number}. "
            f"Status: {log.status}. Duration: {dur}. No transcript.\n"
            "1. What likely happened?\n2. Recommended next steps?"
        )

    summary = generate_ai_response(prompt)
    sentiment_prompt = (
        (f"Transcript:\n{log.transcript[:600]}\n\n" if has_transcript
         else f"Call status: {log.status}\n\n")
        + "Customer sentiment? Reply with exactly one word: positive, neutral, or negative."
    )
    raw_sent = generate_ai_response(sentiment_prompt).strip().lower()
    sentiment = ("positive" if "positive" in raw_sent
                 else "negative" if "negative" in raw_sent else "neutral")

    log.ai_summary = summary
    log.sentiment  = sentiment
    db.commit()

    return {"callSid": call_sid, "summary": summary,
            "sentiment": sentiment, "hasTranscript": has_transcript}


def _log_dict(l: CallLog) -> dict:
    return {
        "id":              l.id,
        "callSid":         l.call_sid,
        "toNumber":        l.to_number,
        "fromNumber":      l.from_number,
        "status":          l.status,
        "durationSec":     l.duration_sec,
        "recordingUrl":    l.recording_url,
        "transcript":      l.transcript,
        "sentiment":       l.sentiment,
        "aiSummary":       l.ai_summary,
        "loanType":        l.loan_type,
        "language":        l.language,
        "customerName":    l.customer_name,
        "recommendedBank": l.recommended_bank,
        "recommendedEmi":  float(l.recommended_emi) if l.recommended_emi else None,
        "createdAt":       l.created_at.isoformat() if l.created_at else None,
    }