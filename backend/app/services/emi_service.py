import math

def calculate_emi(principal, annual_rate, months):

    monthly_rate = annual_rate / 12 / 100

    emi = (
        principal *
        monthly_rate *
        math.pow(1 + monthly_rate, months)
    ) / (
        math.pow(1 + monthly_rate, months) - 1
    )

    return round(emi, 2)