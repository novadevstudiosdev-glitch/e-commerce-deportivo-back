// Este archivo genera los 250 productos automáticamente

export interface ProductData {
  sku: string;
  name: string;
  slug: string;
  description: string;
  category_id: number;
  sport_id: number | null;
  brand_id: number | null;
  base_price: number;
  discount_percentage: number;
  stock: number;
  is_featured: boolean;
  images: string[];
  variants: Array<{
    color: string;
    color_hex: string;
    size: string;
    stock: number;
  }>;
}

// Datos base para generar productos
const CATEGORIES = {
  CALZADO: 1,
  ROPA: 2,
  ACCESORIOS: 3,
  EQUIPAMIENTO: 4,
};

const SPORTS = {
  RUNNING: 1,
  FUTBOL: 2,
  NATACION: 3,
  RUGBY: 4,
  HOCKEY: 5,
  FITNESS: 6,
  CICLISMO: 7,
  TENIS: 8,
  BALONCESTO: 9,
};

const BRANDS = {
  NIKE: 1,
  ADIDAS: 2,
  PUMA: 3,
  REEBOK: 4,
  UNDER_ARMOUR: 5,
  NEW_BALANCE: 6,
  ASICS: 7,
  SALOMON: 8,
};

const COLORS = [
  { name: 'Negro', hex: '#000000' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Azul', hex: '#4169E1' },
  { name: 'Rojo', hex: '#DC143C' },
  { name: 'Verde', hex: '#228B22' },
  { name: 'Gris', hex: '#808080' },
  { name: 'Naranja', hex: '#FF8C00' },
  { name: 'Amarillo', hex: '#FFD700' },
];

const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44', '45'];
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL'];
const CLOTHING_SIZES_KIDS = ['XS', 'S', 'M'];
const UNIQUE_SIZE = ['Única'];

const SPORT_LABELS: Record<number, string> = {
  [SPORTS.RUNNING]: 'running',
  [SPORTS.FUTBOL]: 'futbol',
  [SPORTS.NATACION]: 'natacion',
  [SPORTS.RUGBY]: 'rugby',
  [SPORTS.HOCKEY]: 'hockey',
  [SPORTS.FITNESS]: 'fitness',
  [SPORTS.CICLISMO]: 'ciclismo',
  [SPORTS.TENIS]: 'tenis',
  [SPORTS.BALONCESTO]: 'baloncesto',
};

const SPORT_IMAGE_KEYWORDS: Record<number, string> = {
  [SPORTS.RUNNING]: 'running',
  [SPORTS.FUTBOL]: 'soccer',
  [SPORTS.NATACION]: 'swimming',
  [SPORTS.RUGBY]: 'rugby',
  [SPORTS.HOCKEY]: 'field hockey',
  [SPORTS.FITNESS]: 'fitness',
  [SPORTS.CICLISMO]: 'cycling',
  [SPORTS.TENIS]: 'tennis',
  [SPORTS.BALONCESTO]: 'basketball',
};

const formatList = (items: string[]) => items.filter(Boolean).join(', ');
const formatSpecs = (items: string[]) => items.filter(Boolean).join(' | ');

const getSportLabel = (sportId: number | null) =>
  (sportId ? SPORT_LABELS[sportId] : null) ?? 'deportivo';

const pickColors = (seed: number, count: number) => {
  const safeCount = Math.max(1, Math.min(count, COLORS.length));
  const start = seed % COLORS.length;
  return Array.from({ length: safeCount }, (_item, idx) => COLORS[(start + idx) % COLORS.length]);
};

const getColorCount = (name: string, categoryId: number) => {
  const normalized = normalizeQuery(name).toLowerCase();
  if (normalized.includes('balon') || normalized.includes('gafas') || normalized.includes('gorro')) {
    return 2;
  }
  if (normalized.includes('botella') || normalized.includes('mochila')) {
    return 3;
  }
  if (categoryId === CATEGORIES.CALZADO) return 3;
  if (categoryId === CATEGORIES.ROPA) return 4;
  if (categoryId === CATEGORIES.ACCESORIOS) return 2;
  return normalized.includes('mat') ? 3 : 1;
};

const getSizesForProduct = (categoryId: number, seed: number) => {
  if (categoryId === CATEGORIES.CALZADO) return SHOE_SIZES;
  if (categoryId === CATEGORIES.ROPA) {
    return seed % 12 === 0 ? CLOTHING_SIZES_KIDS : CLOTHING_SIZES;
  }
  return UNIQUE_SIZE;
};

const buildVariants = (
  sizes: string[],
  colors: Array<{ name: string; hex: string }>,
  seed: number,
  baseStock: number,
) =>
  sizes.map((size, idx) => {
    const color = colors[idx % colors.length];
    return {
      color: color.name,
      color_hex: color.hex,
      size,
      stock: baseStock + ((seed + idx) % 8),
    };
  });

const buildSpecs = (
  name: string,
  categoryId: number,
  sportId: number | null,
  seed: number,
) => {
  const normalized = normalizeQuery(name).toLowerCase();
  const specs: string[] = [];

  if (categoryId === CATEGORIES.CALZADO) {
    const weight = 240 + (seed % 70);
    if (sportId === SPORTS.FUTBOL) {
      specs.push('Empeine: sintetico texturado');
      specs.push('Suela: tacos FG/AG');
      specs.push('Placa: rigida con estabilidad');
      specs.push(`Peso: ${weight} g (talle 41)`);
      specs.push('Uso: pasto natural y sintetico');
      return specs;
    }

    const drop = 6 + (seed % 6);
    const foam = ['EVA', 'React', 'Boost', 'FreshFoam'][seed % 4];
    specs.push('Capellada: mesh tecnico');
    specs.push(`Mediasuela: espuma ${foam}`);
    specs.push('Suela: goma con traccion multidireccional');
    specs.push(`Drop: ${drop} mm`);
    specs.push(`Peso: ${weight} g (talle 41)`);
    return specs;
  }

  if (categoryId === CATEGORIES.ROPA) {
    const fit = ['regular', 'entallado', 'relajado'][seed % 3];
    const fabric = ['poliester elastico', 'poliester reciclado', 'poliester con elastano'][seed % 3];
    specs.push(`Tejido: ${fabric}`);
    specs.push(`Ajuste: ${fit}`);
    specs.push('Tecnologia: secado rapido');
    specs.push('Costuras: planas antirozaduras');
    return specs;
  }

  if (categoryId === CATEGORIES.ACCESORIOS) {
    const weight = 80 + (seed % 140);
    if (normalized.includes('gafas')) {
      specs.push('Lente: antiempañante');
      specs.push('Ajuste: doble correa');
      specs.push(`Peso: ${weight} g`);
      specs.push('Uso: entrenamiento y competencia');
      return specs;
    }
    if (normalized.includes('gorro')) {
      specs.push('Material: silicona elastica');
      specs.push('Ajuste: compresivo');
      specs.push(`Peso: ${weight} g`);
      specs.push('Uso: piscina y aguas abiertas');
      return specs;
    }
    if (normalized.includes('balon')) {
      specs.push('Superficie: PU texturado');
      specs.push('Costuras: termoselladas');
      specs.push('Talla: 5');
      specs.push(`Peso: ${weight} g`);
      return specs;
    }
    if (normalized.includes('guantes')) {
      specs.push('Palma: latex de alto agarre');
      specs.push('Cierre: velcro ajustable');
      specs.push(`Peso: ${weight} g`);
      specs.push('Uso: entrenamiento y partido');
      return specs;
    }
    if (normalized.includes('botella')) {
      specs.push('Capacidad: 750 ml');
      specs.push('Material: libre de BPA');
      specs.push(`Peso: ${weight} g`);
      specs.push('Tapa: antigoteo');
      return specs;
    }
    specs.push('Material: poliester/nylon');
    specs.push('Ajuste: regulable');
    specs.push(`Peso: ${weight} g`);
    specs.push('Uso: entrenamiento y competencia');
    return specs;
  }

  const baseWeight = 4 + (seed % 12);
  if (normalized.includes('mat')) {
    specs.push('Material: TPE antideslizante');
    specs.push(`Espesor: ${6 + (seed % 5)} mm`);
    specs.push('Medidas: 180 x 60 cm');
    specs.push('Uso: yoga y entrenamiento funcional');
    return specs;
  }
  if (normalized.includes('bandas')) {
    specs.push('Material: latex resistente');
    specs.push('Resistencia: media');
    specs.push('Largo: 1.2 m');
    specs.push('Uso: fuerza y movilidad');
    return specs;
  }
  if (normalized.includes('cuerda')) {
    specs.push('Largo: 3 m');
    specs.push('Rodamientos: suaves y silenciosos');
    specs.push('Ajuste: rapido');
    specs.push('Uso: cardio y coordinacion');
    return specs;
  }
  if (normalized.includes('rodillo')) {
    specs.push('Material: espuma alta densidad');
    specs.push('Largo: 33 cm');
    specs.push('Densidad: media');
    specs.push('Uso: liberacion miofascial');
    return specs;
  }
  specs.push(`Peso: ${baseWeight} kg`);
  specs.push('Material: goma y acero recubierto');
  specs.push('Agarre: antideslizante');
  specs.push('Uso: entrenamiento funcional');
  return specs;
};

const buildDescription = (
  name: string,
  categoryId: number,
  sportId: number | null,
  sizes: string[],
  colors: Array<{ name: string; hex: string }>,
  seed: number,
) => {
  const sportLabel = getSportLabel(sportId);
  const colorNames = colors.map((color) => color.name);
  const sizeLine = sizes.length ? `Talles disponibles: ${formatList(sizes)}.` : '';
  const colorLine = colorNames.length ? `Colores: ${formatList(colorNames)}.` : '';
  const specs = buildSpecs(name, categoryId, sportId, seed);

  if (categoryId === CATEGORIES.CALZADO) {
    return `${name} pensado para ${sportLabel} y entrenamientos exigentes, con amortiguacion reactiva y soporte estable para sesiones largas. La capellada liviana mejora la ventilacion y el ajuste seguro en cada paso. ${sizeLine} ${colorLine} Especificaciones: ${formatSpecs(specs)}.`;
  }
  if (categoryId === CATEGORIES.ROPA) {
    return `${name} tecnico para ${sportLabel}, confeccionado en tejido elastico y de secado rapido para mantener la piel fresca. El corte favorece la movilidad y las costuras planas reducen roces en entrenamientos intensos. ${sizeLine} ${colorLine} Especificaciones: ${formatSpecs(specs)}.`;
  }
  if (categoryId === CATEGORIES.ACCESORIOS) {
    return `${name} funcional para ${sportLabel}, pensado para comodidad y practicidad en el dia a dia. Materiales resistentes y detalles de ajuste aseguran un uso confiable en cada sesion. ${sizeLine} ${colorLine} Especificaciones: ${formatSpecs(specs)}.`;
  }
  return `${name} diseñado para ${sportLabel} y rutinas de fuerza, con estructura robusta y agarre seguro. Ideal para entrenar en casa o gimnasio sin perder rendimiento. ${sizeLine} ${colorLine} Especificaciones: ${formatSpecs(specs)}.`;
};

// Imágenes de Unsplash por categoría
const normalizeQuery = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const pickImageQuery = (
  name: string,
  categoryId: number,
  sportId?: number | null,
) => {
  const normalized = normalizeQuery(name).toLowerCase();
  const sportKeyword = sportId ? SPORT_IMAGE_KEYWORDS[sportId] ?? 'sports' : 'sports';

  if (normalized.includes('zapatillas') || normalized.includes('botas')) {
    if (sportId === SPORTS.FUTBOL) return 'soccer cleats product';
    if (sportId === SPORTS.RUGBY) return 'rugby boots product';
    if (sportId === SPORTS.HOCKEY) return 'field hockey shoes product';
    return `${sportKeyword} running shoes product`;
  }
  if (normalized.includes('camiseta') || normalized.includes('jersey')) {
    return `${sportKeyword} jersey product`;
  }
  if (normalized.includes('tank top')) {
    return `${sportKeyword} tank top product`;
  }
  if (normalized.includes('pantalon') || normalized.includes('short')) {
    return `${sportKeyword} sports shorts product`;
  }
  if (normalized.includes('mallas')) {
    return `${sportKeyword} compression tights product`;
  }
  if (
    normalized.includes('sudadera') ||
    normalized.includes('chaleco') ||
    normalized.includes('cortavientos')
  ) {
    return `${sportKeyword} sports jacket product`;
  }
  if (normalized.includes('balon')) {
    if (sportId === SPORTS.BALONCESTO) return 'basketball ball product';
    if (sportId === SPORTS.RUGBY) return 'rugby ball product';
    return 'soccer ball product';
  }
  if (normalized.includes('guantes')) {
    return 'sports gloves product';
  }
  if (normalized.includes('gorro')) {
    return 'swim cap product';
  }
  if (normalized.includes('gafas')) {
    return 'swim goggles product';
  }
  if (normalized.includes('banador')) {
    return 'swimsuit product';
  }
  if (normalized.includes('toalla')) {
    return 'sports towel product';
  }
  if (normalized.includes('mochila')) {
    return 'sports backpack product';
  }
  if (normalized.includes('botella')) {
    return 'sports water bottle product';
  }
  if (normalized.includes('mancuernas')) {
    return 'dumbbells product';
  }
  if (normalized.includes('kettlebell')) {
    return 'kettlebell product';
  }
  if (normalized.includes('rodillo')) {
    return 'foam roller product';
  }
  if (normalized.includes('bandas')) {
    return 'resistance bands product';
  }
  if (normalized.includes('cuerda')) {
    return 'jump rope product';
  }
  if (normalized.includes('calcetines') || normalized.includes('medias')) {
    return 'sports socks product';
  }
  if (normalized.includes('espinilleras')) {
    return 'shin guards product';
  }

  if (categoryId == CATEGORIES.CALZADO) return `${sportKeyword} running shoes product`;
  if (categoryId == CATEGORIES.ROPA) return `${sportKeyword} sportswear product`;
  if (categoryId == CATEGORIES.ACCESORIOS) return 'sports accessories product';
  return 'fitness equipment product';
};

const buildImageUrl = (query: string, seed: number) =>
  `https://source.unsplash.com/featured/800x800?${encodeURIComponent(query)}&sig=${seed}`;

const buildImages = (
  name: string,
  categoryId: number,
  sportId: number | null,
  seed: number,
  count = 2,
) => {
  const query = pickImageQuery(name, categoryId, sportId);
  return Array.from({ length: count }, (_item, idx) =>
    buildImageUrl(query, seed * 10 + idx),
  );
};

// Generador de productos
export const generate250Products = (): ProductData[] => {
  const products: ProductData[] = [];
  let id = 1;

  // RUNNING - CALZADO (40 productos)
  const runningShoeModels = [
    'Pro Elite',
    'Air Zoom',
    'Ultraboost',
    'Gel-Kayano',
    'Fresh Foam',
    'Velocity Nitro',
    'Endorphin Speed',
    'Clifton',
    'Ghost',
    'Wave Rider',
    'React Infinity',
    'Solar Glide',
    'Gel-Nimbus',
    'Floatride Energy',
    'HOVR Sonic',
    'Deviate Nitro',
    'ZoomX Vaporfly',
    'Adizero Boston',
    'Speedcross',
    'FuelCell Rebel',
  ];

  runningShoeModels.forEach((model, index) => {
    const brandId = [
      BRANDS.NIKE,
      BRANDS.ADIDAS,
      BRANDS.ASICS,
      BRANDS.PUMA,
      BRANDS.NEW_BALANCE,
    ][index % 5];
    const basePrice = 119.99 + index * 5;
    const discount = index % 3 === 0 ? Math.floor(Math.random() * 30) : 0;
    const name = `Zapatillas Running ${model}`;
    const sizes = getSizesForProduct(CATEGORIES.CALZADO, id);
    const colors = pickColors(id, getColorCount(name, CATEGORIES.CALZADO));

    products.push({
      sku: `ZRP-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `zapatillas-running-${model.toLowerCase().replace(/\s/g, '-')}`,
      description: buildDescription(
        name,
        CATEGORIES.CALZADO,
        SPORTS.RUNNING,
        sizes,
        colors,
        id,
      ),
      category_id: CATEGORIES.CALZADO,
      sport_id: SPORTS.RUNNING,
      brand_id: brandId,
      base_price: basePrice,
      discount_percentage: discount,
      stock: 30 + Math.floor(Math.random() * 40),
      is_featured: index % 5 === 0,
      images: buildImages(
        name,
        CATEGORIES.CALZADO,
        SPORTS.RUNNING,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 6),
    });
    id++;
  });

  // RUNNING - ROPA (30 productos)
  const runningClothingTypes = [
    { type: 'Camiseta Técnica', price: 39.99, sizes: CLOTHING_SIZES },
    { type: 'Tank Top', price: 29.99, sizes: CLOTHING_SIZES },
    { type: 'Pantalón Largo', price: 59.99, sizes: CLOTHING_SIZES },
    { type: 'Shorts', price: 34.99, sizes: CLOTHING_SIZES },
    { type: 'Mallas', price: 49.99, sizes: CLOTHING_SIZES },
    { type: 'Cortavientos', price: 79.99, sizes: CLOTHING_SIZES },
    { type: 'Sudadera', price: 64.99, sizes: CLOTHING_SIZES },
    { type: 'Chaleco', price: 54.99, sizes: CLOTHING_SIZES },
  ];

  for (let i = 0; i < 30; i++) {
    const item = runningClothingTypes[i % runningClothingTypes.length];
    const brandId = [BRANDS.NIKE, BRANDS.ADIDAS, BRANDS.PUMA][i % 3];
    const name = `${item.type} Running Pro ${i + 1}`;
    const sizes = getSizesForProduct(CATEGORIES.ROPA, id);
    const colors = pickColors(id, getColorCount(name, CATEGORIES.ROPA));

    products.push({
      sku: `RRP-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${item.type.toLowerCase().replace(/\s/g, '-')}-running-${i + 1}`,
      description: buildDescription(name, CATEGORIES.ROPA, SPORTS.RUNNING, sizes, colors, id),
      category_id: CATEGORIES.ROPA,
      sport_id: SPORTS.RUNNING,
      brand_id: brandId,
      base_price: item.price,
      discount_percentage: i % 4 === 0 ? 20 : 0,
      stock: 80 + Math.floor(Math.random() * 50),
      is_featured: i % 8 === 0,
      images: buildImages(
        name,
        CATEGORIES.ROPA,
        SPORTS.RUNNING,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 12),
    });
    id++;
  }

  // RUNNING - ACCESORIOS (20 productos)
  const runningAccessories = [
    { name: 'Calcetines Pack 3', price: 14.99 },
    { name: 'Gorra Ajustable', price: 24.99 },
    { name: 'Visera Ultralight', price: 19.99 },
    { name: 'Brazalete Portamóvil', price: 16.99 },
    { name: 'Riñonera Running', price: 29.99 },
    { name: 'Guantes Invierno', price: 22.99 },
    { name: 'Braga Cuello', price: 14.99 },
    { name: 'Cinturón Hidratación', price: 34.99 },
    { name: 'Plantillas Gel', price: 19.99 },
    { name: 'Cordones Elásticos', price: 9.99 },
  ];

  runningAccessories.forEach((acc, index) => {
    const name = `${acc.name} Running`;
    const sizes = UNIQUE_SIZE;
    const colors = pickColors(id, getColorCount(name, CATEGORIES.ACCESORIOS));

    products.push({
      sku: `RAC-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${acc.name.toLowerCase().replace(/\s/g, '-')}-running`,
      description: buildDescription(
        name,
        CATEGORIES.ACCESORIOS,
        SPORTS.RUNNING,
        sizes,
        colors,
        id,
      ),
      category_id: CATEGORIES.ACCESORIOS,
      sport_id: SPORTS.RUNNING,
      brand_id: index % 2 === 0 ? BRANDS.NIKE : null,
      base_price: acc.price,
      discount_percentage: 0,
      stock: 100 + Math.floor(Math.random() * 80),
      is_featured: false,
      images: buildImages(
        name,
        CATEGORIES.ACCESORIOS,
        SPORTS.RUNNING,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 25),
    });
    id++;
  });

  // FÚTBOL - CALZADO (20 productos)
  const footballBoots = [
    'Predator',
    'Mercurial Vapor',
    'X Speedportal',
    'Future Z',
    'Phantom GX',
    'Copa Pure',
    'Tekela',
    'Magnetico Pro',
    'Morelia Neo',
    'Tiempo Legend',
  ];

  footballBoots.forEach((model, index) => {
    const name = `Zapatillas Fútbol ${model}`;
    const sizes = getSizesForProduct(CATEGORIES.CALZADO, id);
    const colors = pickColors(id, getColorCount(name, CATEGORIES.CALZADO));

    products.push({
      sku: `ZFT-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `zapatillas-futbol-${model.toLowerCase().replace(/\s/g, '-')}`,
      description: buildDescription(
        name,
        CATEGORIES.CALZADO,
        SPORTS.FUTBOL,
        sizes,
        colors,
        id,
      ),
      category_id: CATEGORIES.CALZADO,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.ADIDAS, BRANDS.NIKE, BRANDS.PUMA][index % 3],
      base_price: 99.99 + index * 8,
      discount_percentage: index % 4 === 0 ? 15 : 0,
      stock: 35 + Math.floor(Math.random() * 30),
      is_featured: index % 3 === 0,
      images: buildImages(
        name,
        CATEGORIES.CALZADO,
        SPORTS.FUTBOL,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 6),
    });
    id++;
  });

  // FÚTBOL - ROPA (25 productos)
  for (let i = 0; i < 25; i++) {
    const types = ['Camiseta', 'Short', 'Medias', 'Chándal', 'Sudadera'];
    const type = types[i % types.length];
    const name = `${type} Fútbol Pro ${i + 1}`;
    const sizes = getSizesForProduct(CATEGORIES.ROPA, id);
    const colors = pickColors(id, getColorCount(name, CATEGORIES.ROPA));

    products.push({
      sku: `RFT-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${type.toLowerCase()}-futbol-${i + 1}`,
      description: buildDescription(name, CATEGORIES.ROPA, SPORTS.FUTBOL, sizes, colors, id),
      category_id: CATEGORIES.ROPA,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS][i % 2],
      base_price:
        type === 'Chándal' ? 89.99 : type === 'Medias' ? 16.99 : 49.99,
      discount_percentage: i % 5 === 0 ? 20 : 0,
      stock: 90 + Math.floor(Math.random() * 60),
      is_featured: false,
      images: buildImages(
        name,
        CATEGORIES.ROPA,
        SPORTS.FUTBOL,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 12),
    });
    id++;
  }

  // FÚTBOL - ACCESORIOS (15 productos)
  const footballAccessories = [
    { name: 'Espinilleras Pro', price: 19.99 },
    { name: 'Balón Match', price: 44.99 },
    { name: 'Guantes Portero', price: 49.99 },
    { name: 'Bolsa Deporte', price: 39.99 },
    { name: 'Conos Entrenamiento x10', price: 14.99 },
  ];

  footballAccessories.forEach((acc, index) => {
    const name = `${acc.name} Fútbol`;
    const sizes = UNIQUE_SIZE;
    const colors = pickColors(id, getColorCount(name, CATEGORIES.ACCESORIOS));

    products.push({
      sku: `FAC-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${acc.name.toLowerCase().replace(/\s/g, '-')}-futbol`,
      description: buildDescription(
        name,
        CATEGORIES.ACCESORIOS,
        SPORTS.FUTBOL,
        sizes,
        colors,
        id,
      ),
      category_id: CATEGORIES.ACCESORIOS,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS][index % 2],
      base_price: acc.price,
      discount_percentage: 0,
      stock: 70 + Math.floor(Math.random() * 50),
      is_featured: index === 1,
      images: buildImages(
        name,
        CATEGORIES.ACCESORIOS,
        SPORTS.FUTBOL,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 20),
    });
    id++;
  });

  // NATACIÓN (25 productos)
  const swimmingProducts = [
    {
      type: 'Bañador',
      cat: CATEGORIES.ROPA,
      price: 39.99,
      sizes: CLOTHING_SIZES,
    },
    {
      type: 'Gafas',
      cat: CATEGORIES.ACCESORIOS,
      price: 24.99,
      sizes: UNIQUE_SIZE,
    },
    {
      type: 'Gorro',
      cat: CATEGORIES.ACCESORIOS,
      price: 12.99,
      sizes: UNIQUE_SIZE,
    },
    {
      type: 'Toalla',
      cat: CATEGORIES.ACCESORIOS,
      price: 19.99,
      sizes: UNIQUE_SIZE,
    },
    {
      type: 'Palas',
      cat: CATEGORIES.EQUIPAMIENTO,
      price: 22.99,
      sizes: UNIQUE_SIZE,
    },
  ];

  for (let i = 0; i < 25; i++) {
    const prod = swimmingProducts[i % swimmingProducts.length];
    const name = `${prod.type} Natación ${i + 1}`;
    const sizes = getSizesForProduct(prod.cat, id);
    const colors = pickColors(id, getColorCount(name, prod.cat));

    products.push({
      sku: `NAT-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${prod.type.toLowerCase()}-natacion-${i + 1}`,
      description: buildDescription(name, prod.cat, SPORTS.NATACION, sizes, colors, id),
      category_id: prod.cat,
      sport_id: SPORTS.NATACION,
      brand_id: BRANDS.ASICS,
      base_price: prod.price,
      discount_percentage: i % 6 === 0 ? 18 : 0,
      stock: 70 + Math.floor(Math.random() * 60),
      is_featured: i % 8 === 0,
      images: buildImages(
        name,
        prod.cat,
        SPORTS.NATACION,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 18),
    });
    id++;
  }

  // FITNESS/GYM (30 productos)
  const fitnessEquipment = [
    { name: 'Mancuernas', price: 89.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Kettlebell', price: 29.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Cuerda Saltar', price: 16.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Bandas Elásticas', price: 24.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Mat Yoga', price: 34.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Balón Medicinal', price: 29.99, cat: CATEGORIES.EQUIPAMIENTO },
    { name: 'Rodillo Foam', price: 22.99, cat: CATEGORIES.ACCESORIOS },
    { name: 'Guantes Gimnasio', price: 19.99, cat: CATEGORIES.ACCESORIOS },
    { name: 'Mochila Deportiva', price: 59.99, cat: CATEGORIES.ACCESORIOS },
    { name: 'Botella Térmica', price: 24.99, cat: CATEGORIES.ACCESORIOS },
  ];

  for (let i = 0; i < 30; i++) {
    const equip = fitnessEquipment[i % fitnessEquipment.length];
    const name = `${equip.name} Fitness ${i + 1}`;
    const sizes = getSizesForProduct(equip.cat, id);
    const colors = pickColors(id, getColorCount(name, equip.cat));

    products.push({
      sku: `FIT-2024-${String(id).padStart(3, '0')}`,
      name,
      slug: `${equip.name.toLowerCase().replace(/\s/g, '-')}-fitness-${i + 1}`,
      description: buildDescription(name, equip.cat, SPORTS.FITNESS, sizes, colors, id),
      category_id: equip.cat,
      sport_id: SPORTS.FITNESS,
      brand_id: i % 3 === 0 ? BRANDS.REEBOK : null,
      base_price: equip.price,
      discount_percentage: i % 5 === 0 ? 15 : 0,
      stock: 50 + Math.floor(Math.random() * 100),
      is_featured: i % 10 === 0,
      images: buildImages(
        name,
        equip.cat,
        SPORTS.FITNESS,
        id,
        2,
      ),
      variants: buildVariants(sizes, colors, id, 20),
    });
    id++;
  }

  // OTROS DEPORTES - Completar hasta 250
  const remainingCount = 250 - products.length;
  const otherSports = [
    { sportId: SPORTS.RUGBY, name: 'Rugby' },
    { sportId: SPORTS.HOCKEY, name: 'Hockey' },
    { sportId: SPORTS.CICLISMO, name: 'Ciclismo' },
    { sportId: SPORTS.TENIS, name: 'Tenis' },
    { sportId: SPORTS.BALONCESTO, name: 'Baloncesto' },
  ];

  for (let i = 0; i < remainingCount; i++) {
    const sport = otherSports[i % otherSports.length];
    const categories = [
      CATEGORIES.CALZADO,
      CATEGORIES.ROPA,
      CATEGORIES.ACCESORIOS,
    ];
    const cat = categories[i % categories.length];

    let name = '';
    let price = 49.99;
    let sizes = UNIQUE_SIZE;

    if (cat === CATEGORIES.CALZADO) {
      name = `Zapatillas ${sport.name}`;
      price = 99.99;
      sizes = getSizesForProduct(CATEGORIES.CALZADO, id);
    } else if (cat === CATEGORIES.ROPA) {
      name = `Camiseta ${sport.name}`;
      price = 44.99;
      sizes = getSizesForProduct(CATEGORIES.ROPA, id);
    } else {
      name = `Accesorio ${sport.name}`;
      price = 29.99;
    }
    const fullName = `${name} Pro ${i + 1}`;
    const colors = pickColors(id, getColorCount(fullName, cat));

    products.push({
      sku: `OTH-2024-${String(id).padStart(3, '0')}`,
      name: fullName,
      slug: `${name.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
      description: buildDescription(fullName, cat, sport.sportId, sizes, colors, id),
      category_id: cat,
      sport_id: sport.sportId,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS, BRANDS.PUMA, null][i % 4],
      base_price: price,
      discount_percentage: i % 7 === 0 ? 20 : 0,
      stock: 40 + Math.floor(Math.random() * 70),
      is_featured: false,
      images: buildImages(fullName, cat, sport.sportId, id, 2),
      variants: buildVariants(sizes, colors, id, 10),
    });
    id++;
  }

  console.log(`✅ Generated ${products.length} products`);
  return products;
};

