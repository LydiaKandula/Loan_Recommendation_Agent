import math
<<<<<<< HEAD

def calculate_emi(principal, annual_rate, months):

    monthly_rate = annual_rate / 12 / 100

    emi = (
        principal *
        monthly_rate *
        math.pow(1 + monthly_rate, months)
    ) / (
        math.pow(1 + monthly_rate, months) - 1
    )
=======

def calculate_emi(p, r, n):

    r = r / (12 * 100)

    emi = (p * r * (1 + r) ** n) / ((1 + r) ** n - 1)
>>>>>>> main

    return round(emi, 2)