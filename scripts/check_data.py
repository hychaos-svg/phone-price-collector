import pandas as pd

file_path = r'd:\HYC\Documents\开发库\手机价格盯市\data\msrp\phone_msrp_2026-03-04_155409.xlsx'
df = pd.read_excel(file_path)

print('=== 数据概览 ===')
print(f'总行数: {len(df)}')
print(f'列数: {len(df.columns)}')

print('\n=== 前30行数据 ===')
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_rows', 50)
print(df.head(30).to_string(index=False))

print('\n=== 数据统计 ===')
print(f'\n品牌分布:')
print(df['品牌'].value_counts())

print(f'\n版本统计:')
print(f'有版本的记录数: {(df["版本"] != "").sum()}')
print(f'版本为空的记录数: {(df["版本"] == "").sum()}')
print(f'\n版本分布 (前15):')
print(df['版本'].value_counts().head(15))

print(f'\n价格统计:')
print(df['厂商指导价(元)'].describe())

print(f'\n数据质量:')
print(f'有价格的记录数: {df["厂商指导价(元)"].notna().sum()}')
print(f'有上市时间的记录数: {df["上市时间"].notna().sum()}')
print(f'有颜色的记录数: {(df["颜色"] != "").sum()}')
print(f'有版本的记录数: {(df["版本"] != "").sum()}')

print(f'\n不同型号数量: {df["型号"].nunique()}')
print(f'不同价格数量: {df["厂商指导价(元)"].nunique()}')
