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
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const UNIQUE_SIZE = ['Única'];

// Imágenes de Unsplash por categoría
const IMAGES = {
  ZAPATILLAS: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
  ],
  CAMISETA: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
  ],
  PANTALON: [
    'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
  ],
  ACCESORIOS: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  ],
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

    products.push({
      sku: `ZRP-2024-${String(id).padStart(3, '0')}`,
      name: `Zapatillas Running ${model}`,
      slug: `zapatillas-running-${model.toLowerCase().replace(/\s/g, '-')}`,
      description: `Zapatillas profesionales ${model} con tecnología de última generación para runners exigentes.`,
      category_id: CATEGORIES.CALZADO,
      sport_id: SPORTS.RUNNING,
      brand_id: brandId,
      base_price: basePrice,
      discount_percentage: discount,
      stock: 30 + Math.floor(Math.random() * 40),
      is_featured: index % 5 === 0,
      images: IMAGES.ZAPATILLAS.slice(0, (index % 2) + 1),
      variants: SHOE_SIZES.slice(0, 4 + (index % 3)).map((size, i) => ({
        color: COLORS[i % 2].name,
        color_hex: COLORS[i % 2].hex,
        size,
        stock: 5 + Math.floor(Math.random() * 10),
      })),
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

    products.push({
      sku: `RRP-2024-${String(id).padStart(3, '0')}`,
      name: `${item.type} Running Pro ${i + 1}`,
      slug: `${item.type.toLowerCase().replace(/\s/g, '-')}-running-${i + 1}`,
      description: `${item.type} de alto rendimiento con tecnología Dry-Fit.`,
      category_id: CATEGORIES.ROPA,
      sport_id: SPORTS.RUNNING,
      brand_id: brandId,
      base_price: item.price,
      discount_percentage: i % 4 === 0 ? 20 : 0,
      stock: 80 + Math.floor(Math.random() * 50),
      is_featured: i % 8 === 0,
      images: IMAGES.CAMISETA,
      variants: item.sizes.slice(0, 4).map((size, idx) => ({
        color: COLORS[idx % 3].name,
        color_hex: COLORS[idx % 3].hex,
        size,
        stock: 15 + Math.floor(Math.random() * 15),
      })),
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
    products.push({
      sku: `RAC-2024-${String(id).padStart(3, '0')}`,
      name: `${acc.name} Running`,
      slug: `${acc.name.toLowerCase().replace(/\s/g, '-')}-running`,
      description: `${acc.name} diseñado específicamente para runners.`,
      category_id: CATEGORIES.ACCESORIOS,
      sport_id: SPORTS.RUNNING,
      brand_id: index % 2 === 0 ? BRANDS.NIKE : null,
      base_price: acc.price,
      discount_percentage: 0,
      stock: 100 + Math.floor(Math.random() * 80),
      is_featured: false,
      images: IMAGES.ACCESORIOS,
      variants: [
        { color: 'Negro', color_hex: '#000000', size: 'Única', stock: 50 },
        { color: 'Azul', color_hex: '#4169E1', size: 'Única', stock: 50 },
      ],
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
    products.push({
      sku: `ZFT-2024-${String(id).padStart(3, '0')}`,
      name: `Zapatillas Fútbol ${model}`,
      slug: `zapatillas-futbol-${model.toLowerCase().replace(/\s/g, '-')}`,
      description: `Botas de fútbol ${model} profesionales con tacos optimizados.`,
      category_id: CATEGORIES.CALZADO,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.ADIDAS, BRANDS.NIKE, BRANDS.PUMA][index % 3],
      base_price: 99.99 + index * 8,
      discount_percentage: index % 4 === 0 ? 15 : 0,
      stock: 35 + Math.floor(Math.random() * 30),
      is_featured: index % 3 === 0,
      images: IMAGES.ZAPATILLAS,
      variants: SHOE_SIZES.slice(2, 7).map((size, i) => ({
        color: COLORS[i % 2].name,
        color_hex: COLORS[i % 2].hex,
        size,
        stock: 6 + Math.floor(Math.random() * 8),
      })),
    });
    id++;
  });

  // FÚTBOL - ROPA (25 productos)
  for (let i = 0; i < 25; i++) {
    const types = ['Camiseta', 'Short', 'Medias', 'Chándal', 'Sudadera'];
    const type = types[i % types.length];

    products.push({
      sku: `RFT-2024-${String(id).padStart(3, '0')}`,
      name: `${type} Fútbol Pro ${i + 1}`,
      slug: `${type.toLowerCase()}-futbol-${i + 1}`,
      description: `${type} profesional de fútbol con tecnología Climalite.`,
      category_id: CATEGORIES.ROPA,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS][i % 2],
      base_price:
        type === 'Chándal' ? 89.99 : type === 'Medias' ? 16.99 : 49.99,
      discount_percentage: i % 5 === 0 ? 20 : 0,
      stock: 90 + Math.floor(Math.random() * 60),
      is_featured: false,
      images: IMAGES.CAMISETA,
      variants: CLOTHING_SIZES.slice(0, 4).map((size, idx) => ({
        color: COLORS[idx % 4].name,
        color_hex: COLORS[idx % 4].hex,
        size,
        stock: 18 + Math.floor(Math.random() * 12),
      })),
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
    products.push({
      sku: `FAC-2024-${String(id).padStart(3, '0')}`,
      name: `${acc.name} Fútbol`,
      slug: `${acc.name.toLowerCase().replace(/\s/g, '-')}-futbol`,
      description: `${acc.name} profesional para fútbol.`,
      category_id: CATEGORIES.ACCESORIOS,
      sport_id: SPORTS.FUTBOL,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS][index % 2],
      base_price: acc.price,
      discount_percentage: 0,
      stock: 70 + Math.floor(Math.random() * 50),
      is_featured: index === 1,
      images: IMAGES.ACCESORIOS,
      variants: [
        { color: 'Negro', color_hex: '#000000', size: 'Única', stock: 35 },
        { color: 'Blanco', color_hex: '#FFFFFF', size: 'Única', stock: 35 },
      ],
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

    products.push({
      sku: `NAT-2024-${String(id).padStart(3, '0')}`,
      name: `${prod.type} Natación ${i + 1}`,
      slug: `${prod.type.toLowerCase()}-natacion-${i + 1}`,
      description: `${prod.type} profesional para natación de competición.`,
      category_id: prod.cat,
      sport_id: SPORTS.NATACION,
      brand_id: BRANDS.ASICS,
      base_price: prod.price,
      discount_percentage: i % 6 === 0 ? 18 : 0,
      stock: 70 + Math.floor(Math.random() * 60),
      is_featured: i % 8 === 0,
      images: IMAGES.ACCESORIOS,
      variants: prod.sizes.slice(0, 3).map((size, idx) => ({
        color: COLORS[idx % 4].name,
        color_hex: COLORS[idx % 4].hex,
        size,
        stock: 20 + Math.floor(Math.random() * 20),
      })),
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

    products.push({
      sku: `FIT-2024-${String(id).padStart(3, '0')}`,
      name: `${equip.name} Fitness ${i + 1}`,
      slug: `${equip.name.toLowerCase().replace(/\s/g, '-')}-fitness-${i + 1}`,
      description: `${equip.name} de alta calidad para entrenamientos exigentes.`,
      category_id: equip.cat,
      sport_id: SPORTS.FITNESS,
      brand_id: i % 3 === 0 ? BRANDS.REEBOK : null,
      base_price: equip.price,
      discount_percentage: i % 5 === 0 ? 15 : 0,
      stock: 50 + Math.floor(Math.random() * 100),
      is_featured: i % 10 === 0,
      images: IMAGES.ACCESORIOS,
      variants: [
        { color: 'Negro', color_hex: '#000000', size: 'Única', stock: 50 },
      ],
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
      sizes = SHOE_SIZES.slice(0, 5);
    } else if (cat === CATEGORIES.ROPA) {
      name = `Camiseta ${sport.name}`;
      price = 44.99;
      sizes = CLOTHING_SIZES.slice(0, 4);
    } else {
      name = `Accesorio ${sport.name}`;
      price = 29.99;
    }

    products.push({
      sku: `OTH-2024-${String(id).padStart(3, '0')}`,
      name: `${name} Pro ${i + 1}`,
      slug: `${name.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
      description: `Producto profesional de ${sport.name} de alta calidad.`,
      category_id: cat,
      sport_id: sport.sportId,
      brand_id: [BRANDS.NIKE, BRANDS.ADIDAS, BRANDS.PUMA, null][i % 4],
      base_price: price,
      discount_percentage: i % 7 === 0 ? 20 : 0,
      stock: 40 + Math.floor(Math.random() * 70),
      is_featured: false,
      images:
        cat === CATEGORIES.CALZADO ? IMAGES.ZAPATILLAS : IMAGES.ACCESORIOS,
      variants: sizes.map((size, idx) => ({
        color: COLORS[idx % 3].name,
        color_hex: COLORS[idx % 3].hex,
        size,
        stock: 10 + Math.floor(Math.random() * 15),
      })),
    });
    id++;
  }

  console.log(`✅ Generated ${products.length} products`);
  return products;
};
