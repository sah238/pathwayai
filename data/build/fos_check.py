import pandas as pd, json, sys
F=sys.argv[1]
df=pd.read_csv(F,dtype=str,usecols=['UNITID','CIPCODE','CREDLEV','CREDDESC','DEBT_ALL_STGP_EVAL_MDN','EARN_MDN_1YR','IPEDSCOUNT1','IPEDSCOUNT2'])
print(df.CREDLEV.value_counts().sort_index().to_dict()); print(df.groupby('CREDLEV').CREDDESC.first().to_dict())
LV={"Undergraduate certificate":'1',"Associate's":'2',"Bachelor's":'3',"Master's":'5','Doctoral':'6','First professional':'7'}
O=json.load(open('out/occupations.json'))['occupations']
num=lambda s: pd.to_numeric(s,errors='coerce')
def calc(fams,levels):
    sub=df[df.CIPCODE.isin(fams)&df.CREDLEV.isin([LV[l] for l in levels])]
    d=num(sub.DEBT_ALL_STGP_EVAL_MDN).dropna(); e=num(sub.EARN_MDN_1YR).dropna()
    return (round(d.median()) if len(d) else None, round(e.median()) if len(e) else None, len(d), len(e))
for o in O:
    c=o['cip_routing']; fams=c['cip4_families']; 
    if o['soc_code']=='15-1252': fams=[f for f in fams if f!='1107']
    got=calc(fams,c['credential_levels']); want=(c['median_program_debt'],c['median_1yr_earnings'],c['n_programs_debt'],c['n_programs_earnings'])
    print(o['soc_code'],'OK ' if got==want else 'DIFF',want,got)
c=[o for o in O if o['soc_code']=='15-1252'][0]['cip_routing']
print('15-1252 with 1107:',calc(c['cip4_families'],c['credential_levels']))
import math
def half_up(x): return None if x is None else int(math.floor(x+0.5))
sub=df[df.CIPCODE.isin(c['cip4_families'])&(df.CREDLEV=='3')]
d=num(sub.DEBT_ALL_STGP_EVAL_MDN).dropna(); e=num(sub.EARN_MDN_1YR).dropna()
print('15-1252 half-up:',half_up(d.median()),half_up(e.median()),len(d),len(e))
