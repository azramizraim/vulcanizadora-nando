#!/usr/bin/env python3
# Script to update POS.jsx - make services editable from database

with open('/Users/mizraimcardenas/Documents/Claude/Vulcanizadora Nando/src/components/POS.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove servicesList array (const servicesList = [...])
import re
# Pattern to match the servicesList array
pattern = r'const servicesList = \[\s*\{[^;]*\}\s*\]'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 2. Update useEffect to also fetch services
old_effect = '''  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [invData, clientData] = await Promise.all([
          fetchData('Inventario', activeBranch),
          fetchData('Clientes', activeBranch)
        ]);
        if (active) {
          setProducts(Array.isArray(invData) ? invData : []);
          setClients(Array.isArray(clientData) ? clientData : []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    return () => { active = false; };
  }, [activeBranch])'''

new_effect = '''  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [invData, clientData, servicesData] = await Promise.all([
          fetchData('Inventario', activeBranch),
          fetchData('Clientes', activeBranch),
          fetchData('Services', activeBranch)
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
  }, [activeBranch])'''

if old_effect in content:
    content = content.replace(old_effect, new_effect)
    print('Updated useEffect to fetch services')
else:
    print('Could not find useEffect to update')

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
