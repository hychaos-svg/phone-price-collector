import pandas as pd

file_path = r'd:\HYC\Documents\开发库\手机价格盯市\data\msrp\phone_msrp_2026-03-04_150740.xlsx'
df = pd.read_excel(file_path)

print('=== 1. 型号名称不规范问题 ===')
problematic = df[df['型号'].str.contains('￥|\\n|\\r', na=False)]
print(f'问题记录数: {len(problematic)}')
print('\n问题型号示例:')
for i, row in problematic.head(10).iterrows():
    print(f'  "{row["型号"]}" -> 价格: {row["厂商指导价(元)"]}')

print('\n=== 2. 版本号为空的记录 ===')
empty_version = df[df['版本'].isna() | (df['版本'] == '')]
print(f'版本为空记录数: {len(empty_version)}')
print(f'总记录数: {len(df)}')
print(f'版本为空比例: {len(empty_version)/len(df)*100:.1f}%')

print('\n=== 3. 查看正常型号示例 ===')
normal = df[~df['型号'].str.contains('￥|\\n|\\r', na=False)]
print(normal[['型号', '版本', '厂商指导价(元)']].head(15).to_string(index=False))
