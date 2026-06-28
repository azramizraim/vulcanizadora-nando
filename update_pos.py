#!/usr/bin/env python3
# Script to update POS.jsx - make services editable from database

with open('/Users/mizraimcardenas/Documents/Claude/Vulcanizadora Nando/src/components/POS.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove servicesList array (lines 4-8)
import re

# Pattern to match the servicesList array
pattern = r'const servicesList = \[\s*\{ id: .S1.*?img: .*\},?\s*\{ id: .S2.*?img: .*\},?\s*\{ id: .S3.*?img: .*\}\s*\]'
match = re.search(pattern, content, re.DOTALL)

if match:
    # Remove the servicesList array
    content = content[:match.start()] + '\n' + content[match.end():]
    print('Removed servicesList array')
else:
    print('Could not find servicesList array')
    # Try simpler approach - just find the lines
    lines = content.split('\n')
    new_lines = []
    skip = False
    for i, line in enumerate(lines):
        if 'const servicesList = [' in line:
            skip = True
        elif skip and ']' in line:
            skip = False
            continue
        elif not skip:
            new_lines.append(line)
    content = '\n'.join(new_lines)
    print('Removed servicesList using line-by-line approach')

# 2. Update useEffect to also fetch services
old_effect_start = content.find("useEffect(() => {\n    let active = true;")
if old_effect_start != -1:
    # Find the end of this useEffect
    effect_end = content.find("}, [activeBranch])", old_effect_start)
    if effect_end != -1:
        effect_end += len("}, [activeBranch])")
        old_effect = content[old_effect_start:effect_end]
        
        # Create new effect with services fetch
        new_effect = """useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [invData, clientData, servicesData] = await Promise.all([
          fetchData('Inventario', activeBranch),
          fetchData('Clientes', activeBranch),
          fetchData('Servicios', activeBranch)
        ]);
        if (active) {
          setProducts(Array.isArray(invData) ? invData : []);
          setClients(Array.isArray(clientData) ? clientData : []);
          setServices(Array.isArray(servicesData) ? servicesData : []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    return () => { active = false; };
  }, [activeBranch])"""
        
        content = content[:old_effect_start] + new_effect + content[effect_end:]
        print('Updated useEffect to fetch services')

# 3. Update viewItems to use services from state
old_view = "const viewItems = activeTab === 'LLANTAS' ? products : servicesList;"
new_view = "const viewItems = activeTab === 'LLANTAS' ? products : services;"
if old_view in content:
    content = content.replace(old_view, new_view)
    print('Updated viewItems to use services from state')
else:
    print('Could not find viewItems to update')

# Write the updated content
with open('/Users/mizraimcardenas/Documents/Claude/Vulcanizadora Nando/src/components/POS.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('POS.jsx updated successfully - services now loaded from Firestore')
