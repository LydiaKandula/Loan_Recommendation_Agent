def calculate_emi(principal, annual_rate, months):

    r = annual_rate / (12 * 100)

    emi = (
        principal * r * ((1 + r) ** months)
    ) / (((1 + r) ** months) - 1)

    return round(emi, 2)