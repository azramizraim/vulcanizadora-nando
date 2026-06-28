# Diseño: Importación CSV Mejorada con Búsqueda Web y Scanner

## 1. Resumen del Cambio

Mejorar el sistema de importación CSV del inventario para:
- Identificar productos nuevos vs existentes durante preview
- Permitir búsqueda web para productos nuevos (nombre, marca, precio, costo)
- Mantener escáner de cámara para agregar productos manualmente

## 2. Flujo de Usuario

```
[Usuario sube CSV]
       ↓
[Preview: lista productos]
       ↓
[Separar en 2 grupos:]
  • Existentes (actualizar cantidad)
  • Nuevos (crear + opción buscar)
       ↓
[Para nuevos: Botón "🔍 Buscar" por producto]
       ↓
[Resultado: llena campos editables]
       ↓
[Usuario/edita/ajusta si necesita]
       ↓
[Importar todo]
```

## 3. UI/UX - Preview de Importación

### Estructura del Modal

```
┌─────────────────────────────────────────┐
│  📥 Preview Importación CSV            │
├─────────────────────────────────────────┤
│  Existentes (actualizar): 5 productos  │
│  [Lista con cantidad a agregar]        │
│                                         │
│ Nuevos (crear): 3 productos            │
│  ┌─────────────────────────────────┐   │
│  │ SKU: LLN-175-65-14-MICH        │   │
│  │ [🔍 Buscar]                     │   │
│  │ Nombre: [edit]                 │   │
│  │ Marca: [edit]                  │   │
│  │ Precio: [edit]   Costo: [edit] │   │
│  │ Cantidad: [edit]               │   │
│  └─────────────────────────────────┘   │
│  [SKU2] [🔍 Buscar] ...               │
└────────────────────────────────────────┘
```

### Estados de Producto Nuevo

| Estado | Color | Descripción |
|--------|-------|-------------|
| Pendiente | Gris | Sin buscar, editable manualmente |
| Buscando | Azul | Cargando datos de web |
| Completo | Verde | Datos encontrados, editable |
| Error | Rojo | No se encontró, editable manualmente |

## 4. Funcionalidad - Búsqueda Web

### Trigger
- Click en botón "🔍 Buscar" junto a producto nuevo
- También botón "🔍 Buscar Todos" para automatizar

### Método de Búsqueda
- Usar DuckDuckGo o Google custom search
- Query: `${sku} ${nombre}` o solo `sku`
- Extraer: nombre, marca, precio estimado, descripción

### Notas
- Por ahora: búsqueda simple, puede no encontrar datos
- El usuario siempre puede editar manualmente
- Fase 2: mejorar precisión de búsqueda

## 5. Componentes a Modificar

### Inventory.jsx
- `handleFileImport()` - mantener
- `handleConfirmImport()` - separar lógica exist/nuevo
- **Nuevo**: `handleWebSearch(product)` - buscar online
- **Nuevo**: `handleSearchAll()` - buscar todos los nuevos
- **Nuevo**: Componente modal con estados visuales
- **Nuevo**: `importData` con campos: `status`, `searched`

### Estados UI para Preview

```javascript
const [importData, setImportData] = useState([]) // objects:
// { name, brand, price, cost, qty, sku, status: 'pending'|'searching'|'complete'|'error' }
```

## 6. Datos del CSV

Formato esperado:
| Campo | Requerido | Notas |
|-------|-----------|-------|
| nombre | Sí |Editable |
| marca | Sí |Editable |
| precio | Sí |Editable |
| costo | Opcional |Editable |
| cantidad | Sí |Editable |
| sku | Sí |Identificador único |

## 7. Lógica de Importación

```javascript
for (const product of importData) {
  const existing = products.find(p => p.sku === product.sku)
  
  if (existing) {
    // Actualizar: sumar cantidad
    await updateData('Inventario', existing.id, {
      qty: existing.qty + product.qty
    })
  } else {
    // Crear nuevo
    await postData('Inventario', {
      name: product.name,
      brand: product.brand,
      price: product.price,
      cost: product.cost,
      qty: product.qty,
      sku: product.sku,
      branch: activeBranch
    })
  }
}
```

## 8. Scanner de Cámara

Ya implementado en línea ~212-253:
- Usa Html5Qrcode
- `facingMode: 'environment'` (cámara trasera)
- Al escanear: agrega a formulario para agregar manual

Se mantiene igual para agregar productos individuales.

## 9. Errores y Edge Cases

| Caso | Manejo |
|------|--------|
| SKU duplicado en CSV | Sumar todas las cantidades |
| Campos vacíos en CSV | Permitir, editable en preview |
| Búsqueda web vacía | Queda editable manualmente |
| Error de red en búsqueda | Mostrar error, permitir reintentar |
| Archivo no es CSV | Validar y mostrar error |

## 10. Testing

- Probar con archivo de 10+ productos
- Probar: algunos SKU existen, otros no
- Probar: búsqueda web para productos nuevos
- Probar: editar datos antes de importar
- Probar: escáner de cámara funciona