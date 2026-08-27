import pandas as pd

gestion = '20267AV34B0CEC5'

# Fechas clave por ronda
creacion = pd.Timestamp('2026-07-29 10:26:28')

asig_1 = pd.Timestamp('2026-07-30 12:58:30')
rev_1  = pd.Timestamp('2026-07-30 12:59:43')
rec_1  = pd.Timestamp('2026-07-30 12:59:43')

asig_2 = pd.Timestamp('2026-07-30 16:13:01')
rev_2  = pd.Timestamp('2026-07-31 09:11:39')
rec_2  = pd.Timestamp('2026-07-31 09:11:39')

asig_3 = pd.Timestamp('2026-07-31 15:50:45')
rev_3  = pd.Timestamp('2026-07-31 15:52:14')
rec_3  = pd.Timestamp('2026-07-31 15:52:14')

asig_4 = pd.Timestamp('2026-08-01 07:26:09')
rev_4  = pd.Timestamp('2026-08-01 07:26:34')
rec_4  = pd.Timestamp('2026-08-01 07:26:34')

def mins(a, b):
    return round((b - a).total_seconds() / 60, 1)

print("=" * 100)
print("TIEMPO DEL REVISOR - Caso 20267AV34B0CEC5")
print("=" * 100)
print()
print("BANDEJA = tiempo desde ASIGNACION hasta que el REVISOR abre (FechaRevision)")
print("DICTAMEN = tiempo desde que el REVISOR abre hasta que emite resolucion")
print()

header = "{:<6} {:<22} {:<22} {:<22} {:>10} {:>10}".format(
    "Ronda", "Asignacion", "Revision", "Rechazo", "Bandeja", "Dictamen")
print(header)
print("-" * 100)

row = "{:<6} {:<22} {:<22} {:<22} {:>10.1f} {:>10.1f}"

# R1
t_ban_1 = mins(asig_1, rev_1)
t_dic_1 = mins(rev_1, rec_1)
print(row.format("R1", str(asig_1)[:19], str(rev_1)[:19], str(rec_1)[:19], t_ban_1, t_dic_1))

# R2
t_ban_2 = mins(asig_2, rev_2)
t_dic_2 = mins(rev_2, rec_2)
print(row.format("R2", str(asig_2)[:19], str(rev_2)[:19], str(rec_2)[:19], t_ban_2, t_dic_2))

# R3
t_ban_3 = mins(asig_3, rev_3)
t_dic_3 = mins(rev_3, rec_3)
print(row.format("R3", str(asig_3)[:19], str(rev_3)[:19], str(rec_3)[:19], t_ban_3, t_dic_3))

# R4
t_ban_4 = mins(asig_4, rev_4)
t_dic_4 = mins(rev_4, rec_4)
print(row.format("R4", str(asig_4)[:19], str(rev_4)[:19], str(rec_4)[:19], t_ban_4, t_dic_4))

print("-" * 100)

total_ban = t_ban_1 + t_ban_2 + t_ban_3 + t_ban_4
total_dic = t_dic_1 + t_dic_2 + t_dic_3 + t_dic_4
total = total_ban + total_dic

print("{:<6} {:<22} {:<22} {:<22} {:>10.1f} {:>10.1f}".format(
    "", "", "", "TOTAL", total_ban, total_dic))
print("{:<6} {:<22} {:<22} {:<22} {:>10.1f}".format(
    "", "", "", "TOTAL", total))
print("=" * 100)

print()
print("RESUMEN DEL REVISOR")
print("=" * 50)
print("  Bandeja (espera ser abierto): {:>8.1f} min  ({:.1f}%)".format(total_ban, total_ban/total*100))
print("  Dictamen (en pantalla):      {:>8.1f} min  ({:.1f}%)".format(total_dic, total_dic/total*100))
print("  TOTAL REVISOR:               {:>8.1f} min".format(total))
