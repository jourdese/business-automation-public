"""One-time, review-branch-only mechanical reorganization. Removed after checks pass."""
from pathlib import Path
import os, re, shutil, json
import tinycss2

assert os.environ.get('GITHUB_REF') == 'refs/heads/restaurant/the-rib-crib-v2'
root=Path.cwd()
f=root/'frontend'
component=f/'components/business-sites/restaurant/the-rib-crib'
shared=f/'components/business-sites/restaurant/shared'
lib=f/'lib/businesses/restaurant/the-rib-crib'
sharedlib=f/'lib/businesses/restaurant/shared'
archive=root/'docs/archive/rib-crib-legacy'
for p in [component.parent,shared,lib.parent,sharedlib,archive]:p.mkdir(parents=True, exist_ok=True)

def write(p,s):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
def move(a,b):
 b.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(a),str(b))

assert not component.exists()
move(f/'components/rib-crib-v2',component)
move(component/'RibCribV2Page.tsx',component/'RibCribPage.tsx')
move(component/'RibCribV2.module.css',component/'RibCribPage.module.css')
move(f/'lib/rib-crib-v2',lib)
legacy_names=['rib-crib.css','rib-crib-polish.css','rib-crib-reference.css','rib-crib-hires.css','rib-crib-jourvis-fixed.css','rib-crib-final-cleanup.css']
chatclasses={'rib-jourvis-chat','rib-jourvis-chat-head','rib-jourvis-chat-identity','rib-jourvis-mini','rib-jourvis-chat-intro','rib-jourvis-log','rib-chat-empty','rib-chat-message','rib-chat-avatar','rib-chat-typing','rib-chat-choices','rib-chat-error','rib-chat-retry','rib-chat-composer','rib-chat-disclaimer'}
def split_selectors(tokens):
 groups=[[]]
 for token in tokens:
  if token.type=='literal' and token.value==',':groups.append([])
  else:groups[-1].append(token)
 return [tinycss2.serialize(g).strip() for g in groups if tinycss2.serialize(g).strip()]
def extract_legacy(nodes):
 out=[]
 for node in nodes:
  if node.type=='qualified-rule':
   selected=[]
   for s in split_selectors(node.prelude):
    classes=re.findall(r'\.([\w-]+)',s)
    if not classes or classes[0] not in chatclasses or '.rib-crib-page' in s:continue
    if re.match(r'^\.rib-jourvis-chat(?=[\s:>.#\[]|$)',s):
     s=':where(.theme):global('+s+')'
    else:s=':where(.theme) :global('+s+')'
    selected.append(s)
   if selected:out.append(',\n'.join(selected)+' {'+tinycss2.serialize(node.content)+'}\n')
  elif node.type=='at-rule' and node.content is not None:
   if node.lower_at_keyword in ['media','supports']:
    inner=extract_legacy(tinycss2.parse_rule_list(node.content,skip_whitespace=True,skip_comments=True))
    if inner:out.append('@'+node.at_keyword+' '+tinycss2.serialize(node.prelude).strip()+' {\n'+inner+'}\n')
   elif node.lower_at_keyword.endswith('keyframes') and tinycss2.serialize(node.prelude).strip() in ['ribTyping','ribChatIn']:
    out.append(tinycss2.serialize([node]))
 return ''.join(out)
legacy='/* Preserved chat defaults from the old global cascade. Every rule is panel-scoped. */\n'
for n in legacy_names:
 css=(f/'app'/n).read_text()
 if n=='rib-crib.css':
  variables=re.search(r':root\s*\{([\s\S]*?)\}',css).group(1)
  legacy+='.theme {'+variables+'}\n'
 legacy+=extract_legacy(tinycss2.parse_stylesheet(css,skip_whitespace=True,skip_comments=True))
 move(f/'app'/n,archive/'styles'/n)
page_css=(component/'RibCribPage.module.css').read_text()
lines=page_css.splitlines(keepends=True)
start=next(i for i,l in enumerate(lines) if l.startswith('.chatPanel {'))
end=next(i for i in range(start,len(lines)) if lines[i].startswith('.root [data-entered'))
theme=''.join(lines[start:end]).replace('.chatPanel','.theme')
page_css=''.join(lines[:start]+lines[end:])
mobile_theme=[l.replace('.chatPanel','.theme') for l in page_css.splitlines(keepends=True) if l.lstrip().startswith('.chatPanel ')]
page_css=''.join(l for l in page_css.splitlines(keepends=True) if not l.lstrip().startswith('.chatPanel '))
assert len(mobile_theme)==2
prior=''.join(lines[:next(i for i,l in enumerate(lines) if l.lstrip().startswith('.chatPanel {') and i>start)])
media=re.findall(r'@media\s*([^\{]+)\{',prior)[-1].strip()
theme+='@keyframes typing { 50% { opacity: .4; transform: translateY(-2px); } }\n'
theme+='@media '+media+' {\n'+''.join(mobile_theme)+'}\n'
page_css=page_css.replace(', .chatPanel','').replace(',.chatPanel','')
page_css=page_css.replace('/* V2 chat uses the same component/protocol, but not the legacy restaurant CSS cascade. */\n','')
page_css=page_css.replace('@keyframes typing { 50% { opacity: .4; transform: translateY(-2px); } }\n','')
page_css=page_css.replace('/* The V2 route has its own visual system. Legacy .rib-crib-page selectors never match it. */','/* Restaurant-owned visual system; shared chat styling lives beside RestaurantJourvisChat. */')
write(component/'RibCribPage.module.css',page_css)
fixed=(f/'components/jourvis/RibCribJourvisChat.module.css').read_text()
write(shared/'RestaurantJourvisChat.module.css',legacy+'\n/* Active restaurant chat theme, formerly inside the Rib Crib page module. */\n'+theme+'\n'+fixed)
(f/'components/jourvis/RibCribJourvisChat.module.css').unlink()
for n in ['RibCribAssetBridge.tsx','RibCribPage.module.css','RibCribPage.tsx']:
 move(f/'components/jourvis'/n,archive/'components'/n)
move(f/'lib/rib-crib',archive/'embedded-assets')
source=f/'src/assets/rib-crib'
assetbase=f/'src/assets/businesses/restaurant/the-rib-crib'
asset_mapping={}
for p in list(source.iterdir()):
 name=p.name
 if name in ['rib-crib-dark-wood-background.png','rib-crib-orders-bbq-background.png','rib-crib-restaurant-interior.jpg','rib-crib-restaurant-interior.png']:
  group='atmosphere'
 elif name in ['TheRibCribWhite.png','eat-meat-repeat.png','rib-crib-emblem.png','rib-crib-footer-brand-lockup.png','rib-crib-good-food-good-people.png','rib-crib-life-is-better-with-bbq.png','rib-crib-profile.png','rib-crib-thumbnail.png','rib-crib-icon-signature-flavors.png']:
  group='branding'
 elif name=='337696127_892397995373233_2982850852035596824_n.jpg':group='source'
 elif name=='README.md':group=''
 else:group='food'
 target=assetbase/group/name
 asset_mapping['src/assets/rib-crib/'+name]='src/assets/businesses/restaurant/the-rib-crib/'+(group+'/' if group else '')+name
 move(p,target)
source.rmdir()
experience=f/'components/jourvis/JourvisExperience.tsx'
s=experience.read_text();definition=re.search(r'export type InitialBusiness = \{[\s\S]*?\n\};',s).group(0)
write(f/'lib/businesses/types.ts',definition+'\n\nexport type BusinessSiteProps = { business: InitialBusiness };\n')
write(experience,s.replace(definition,"import type { InitialBusiness } from '@/lib/businesses/types';"))
for p in list(f.rglob('*'))+list((root/'docs/rib-crib-v2').glob('*.md')):
 if not p.is_file() or p.suffix not in ['.ts','.tsx','.css','.md','.mjs','.json']:continue
 if p.name=='package-lock.json':continue
 s=p.read_text()
 s=s.replace('components/rib-crib-v2/','components/business-sites/restaurant/the-rib-crib/')
 s=s.replace('lib/rib-crib-v2/','lib/businesses/restaurant/the-rib-crib/')
 s=s.replace('RibCribV2.module.css','RibCribPage.module.css').replace('RibCribV2Page','RibCribPage')
 for a,b in asset_mapping.items():s=s.replace(a,b)
 s=re.sub(r"import type \{ InitialBusiness \} from '[^']*JourvisExperience';", "import type { InitialBusiness } from '@/lib/businesses/types';",s)
 if p==component/'RibCribPage.tsx':
  s=s.replace("from '../jourvis/JourvisCompanion'","from '@/components/jourvis/JourvisCompanion'")
  s=s.replace("import RibCribJourvisChat from '../jourvis/RibCribJourvisChat';","import RestaurantJourvisChat from '../shared/RestaurantJourvisChat';\nimport { ribCribSiteConfig } from '@/lib/businesses/restaurant/the-rib-crib/config';")
  s=s.replace('<RibCribJourvisChat business={business} className={styles.chatPanel} />','<RestaurantJourvisChat business={business} presentation={ribCribSiteConfig.chat} />')
  s=s.replace("new CustomEvent('ribcrib:jourvis'",'new CustomEvent(ribCribSiteConfig.chat.openEvent')
  s=s.replace("'ribcrib:chat-state'",'ribCribSiteConfig.chat.stateEvent')
  s=s.replace('`ribcrib.meal-plan.v2:${business.publicPath}`','`${ribCribSiteConfig.mealPlanStoragePrefix}:${business.publicPath}`')
 write(p,s)
chat=(f/'components/jourvis/RibCribJourvisChat.tsx').read_text()
chat=chat.replace("from './JourvisCompanion'","from '@/components/jourvis/JourvisCompanion'").replace("from './JourvisLauncher'","from '@/components/jourvis/JourvisLauncher'")
chat=chat.replace("import styles from './RibCribJourvisChat.module.css';","import styles from './RestaurantJourvisChat.module.css';\nimport type { RestaurantChatPresentation } from '@/lib/businesses/restaurant/shared/chat-config';")
chat=re.sub(r"const QUICK_PROMPTS = \[[^\n]+\];\n",'',chat)
chat=chat.replace("export default function RibCribJourvisChat({ business, className = '' }: { business: InitialBusiness; className?: string }) {", "export default function RestaurantJourvisChat({ business, presentation, className = '' }: { business: InitialBusiness; presentation: RestaurantChatPresentation; className?: string }) {")
chat=chat.replace("setError('This session left The Rib Crib demo. Reconnect to continue with this restaurant.');","setError(`This session left ${business.displayName} demo. Reconnect to continue with this restaurant.`);")
chat=chat.replace("'ribcrib:jourvis'",'presentation.openEvent').replace("'ribcrib:chat-state'",'presentation.stateEvent')
chat=chat.replace("}, []);\n  useEffect(() => {\n    window.dispatchEvent", "}, [presentation.openEvent]);\n  useEffect(() => {\n    window.dispatchEvent")
chat=chat.replace('}, [open, ensureRestaurant]);','}, [open, ensureRestaurant, presentation.stateEvent]);')
chat=chat.replace('id="rib-jourvis-panel"','id={presentation.panelId}').replace('aria-describedby="rib-chat-disclaimer"','aria-describedby={presentation.disclaimerId}')
chat=chat.replace('className={`rib-jourvis-chat ${styles.panel}', 'className={`rib-jourvis-chat ${styles.theme} ${styles.panel}')
chat=chat.replace('Jourvis × The Rib Crib','Jourvis × {business.displayName}')
chat=chat.replace("'The Rib Crib restaurant preset loaded'",'`${business.displayName} restaurant preset loaded`')
chat=chat.replace('QUICK_PROMPTS.map','presentation.quickPrompts.map')
chat=chat.replace('htmlFor="rib-jourvis-message"','htmlFor={presentation.messageId}').replace('id="rib-jourvis-message"','id={presentation.messageId}').replace('id="rib-chat-disclaimer"','id={presentation.disclaimerId}')
chat=chat.replace('placeholder="Ask about ribs, platters, reservations…"','placeholder={presentation.placeholder}')
chat=chat.replace('controls="rib-jourvis-panel" label="Chat with Jourvis for The Rib Crib" hint="Menu, platters & reservations"','controls={presentation.panelId} label={`Chat with Jourvis for ${business.displayName}`} hint={presentation.hint}')
chat=chat.replace("role: 'customer', text: clean", "role: 'customer' as const, text: clean")
write(shared/'RestaurantJourvisChat.tsx',chat)
(f/'components/jourvis/RibCribJourvisChat.tsx').unlink()
layout=f/'app/layout.tsx';s=layout.read_text()
for n in legacy_names:s=s.replace("import './"+n+"';\n",'')
s=s.replace('data-build="rib-crib-route-scoped"','data-build="business-sites-scoped"');write(layout,s)
generic=f/'components/jourvis/BusinessDemoPage.tsx'
s=generic.read_text().replace("import RibCribPage from './RibCribPage';\n",'')
s=s.replace("  if (business.publicPath === '/restaurant/the-rib-crib') {\n    return <RibCribPage business={business} />;\n  }\n\n",'');write(generic,s)
page=f/'app/[vertical]/[business]/page.tsx'
s=page.read_text().replace("import BusinessDemoPage from '@/components/jourvis/BusinessDemoPage';","import BusinessSiteRenderer from '@/components/business-sites/BusinessSiteRenderer';").replace('<BusinessDemoPage','<BusinessSiteRenderer');write(page,s)
original=(lib/'meal-plan.ts').read_text();boundary=original.index('export function manilaToday')
calcs=original[original.index('/** Only dish'):boundary].replace('export function ','function ')
factory='''export type MealPlan = Record<string, number>;
export type PlannableDish = { name: string; price: number | null };
export type MealPlanCatalog = Readonly<Record<string, PlannableDish | undefined>>;

/** Bind one catalog per restaurant. Prices remain in major currency units, as before. */
export function createMealPlanner(dishById: MealPlanCatalog, peso: (value: number) => string) {
'''+''.join('  '+l if l.strip() else l for l in calcs.splitlines(keepends=True))+'''  return { sanitizePlan, adjustPlan, summarizePlan, mealPlanPrompt, priceSummary };
}
'''
write(sharedlib/'meal-plan.ts',factory);write(sharedlib/'prompts.ts',original[boundary:])
write(lib/'meal-plan.ts',"import { dishById, peso } from './content.ts';\nimport { createMealPlanner } from '../shared/meal-plan.ts';\n\nexport type { MealPlan } from '../shared/meal-plan.ts';\nexport { manilaToday, reservationPrompt } from '../shared/prompts.ts';\n\n// Keep this binding restaurant-owned: no other site can accidentally use this menu.\nexport const { sanitizePlan, adjustPlan, summarizePlan, mealPlanPrompt, priceSummary } =\n  createMealPlanner(dishById, peso);\n")
p=f/'scripts/rib-crib-centering.test.ts';s=p.read_text().replace('../components/jourvis/RibCribJourvisChat.module.css','../components/business-sites/restaurant/shared/RestaurantJourvisChat.module.css')
s=s.replace("css.match(/:global\\(\\.rib-jourvis-mini\\)", "css.match(/\\.panel:global\\(\\.rib-jourvis-chat\\) :global\\(\\.rib-jourvis-mini\\)")
s=s.replace("css.match(/:global\\(\\.rib-jourvis-log\\)", "css.match(/\\.panel:global\\(\\.rib-jourvis-chat\\) :global\\(\\.rib-jourvis-log\\)");write(p,s)
p=f/'scripts/rib-crib-regressions.test.ts';s=p.read_text().replace('restaurant metadata uses fitted social-card artwork without replacing homepage metadata','restaurant metadata retains the published PNG thumbnail without replacing homepage metadata')
s=s.replace('../public/rib-crib/rib-crib-social-fit.jpg','../public/rib-crib/rib-crib-thumbnail.png').replace('width: 600, height: 315','width: 1200, height: 630')
s=s.replace('assert.equal(image[0], 0xff);\n  assert.equal(image[1], 0xd8);',"assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);");write(p,s)
print('Mechanical restructuring complete; mobile chat condition:',media)
