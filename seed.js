require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const env = require("./src/configs/env");
const generateSlug = require("./src/utils/helpers.util");
const { Category, Subcategory } = require("./src/models/category.model");
const Product = require("./src/models/product.model");
const User = require("./src/models/user.model");
const Cart = require("./src/models/cart.model");
const Order = require("./src/models/order.model");
const Testimonial = require("./src/models/testimonial.model");
const StaticContent = require("./src/models/static-content.model");

const DEFAULT_COUNTS = {
  users: 120,
  products: 400,
  orders: 260,
  carts: 75,
  testimonials: 160,
};

const CATEGORY_BLUEPRINT = [
  {
    name: "Women Clothing",
    subs: ["Dresses", "Blouses", "Pants", "Skirts", "Jackets"],
  },
  {
    name: "Men Clothing",
    subs: ["T-Shirts", "Shirts", "Pants", "Hoodies", "Jackets"],
  },
  {
    name: "Shoes",
    subs: ["Sneakers", "Casual Shoes", "Formal Shoes", "Boots"],
  },
  { name: "Accessories", subs: ["Bags", "Belts", "Glasses", "Watches"] },
  {
    name: "Personal Care",
    subs: ["Perfumes", "Skin Care", "Hair Care"],
  },
];

const MALE_FIRST_NAMES = [
  "Ahmed",
  "Omar",
  "Youssef",
  "Kareem",
  "Ibrahim",
  "Hassan",
  "Mostafa",
  "Ali",
  "Ziad",
  "Adel",
];
const FEMALE_FIRST_NAMES = [
  "Mariam",
  "Salma",
  "Nour",
  "Farah",
  "Hoda",
  "Laila",
  "Yara",
  "Jana",
  "Aya",
  "Malak",
];
const LAST_NAMES = [
  "Mahmoud",
  "Khaled",
  "Sayed",
  "Nasser",
  "Fawzy",
  "Ibrahim",
  "Abdelrahman",
  "Tarek",
  "Samir",
  "Hegazy",
];
const CITIES = ["Cairo", "Alexandria", "Giza", "Mansoura", "Tanta", "Zagazig"];
const DISTRICTS = [
  "Downtown",
  "Nasr City",
  "Maadi",
  "Smouha",
  "Dokki",
  "Heliopolis",
];

const ADJECTIVES = [
  "Classic",
  "Premium",
  "Light",
  "Modern",
  "Casual",
  "Elegant",
  "Urban",
];
const COLORS = [
  "Black",
  "White",
  "Navy",
  "Beige",
  "Olive",
  "Gray",
  "Brown",
  "Blue",
];
const MATERIALS = [
  "Cotton",
  "Linen",
  "Denim",
  "Wool",
  "Leather",
  "Silk",
  "Polyester",
];

const SUBCATEGORY_TITLES = {
  Dresses: ["Dress", "Midi Dress", "Maxi Dress"],
  Blouses: ["Blouse", "Top", "Shirt"],
  Pants: ["Pants", "Jeans", "Trouser"],
  Skirts: ["Skirt", "Pleated Skirt", "Midi Skirt"],
  Jackets: ["Jacket", "Blazer", "Coat"],
  "T-Shirts": ["T-Shirt", "Polo", "Basic Tee"],
  Shirts: ["Shirt", "Formal Shirt", "Slim Shirt"],
  Hoodies: ["Hoodie", "Sweatshirt", "Zip Hoodie"],
  Sneakers: ["Sneakers", "Runner", "Street Shoes"],
  "Casual Shoes": ["Casual Shoes", "Slip-On", "Loafers"],
  "Formal Shoes": ["Formal Shoes", "Oxford", "Derby"],
  Boots: ["Boots", "Ankle Boots", "Chelsea Boots"],
  Bags: ["Bag", "Crossbody Bag", "Tote Bag"],
  Belts: ["Belt", "Leather Belt", "Classic Belt"],
  Glasses: ["Sunglasses", "Frame", "Aviator"],
  Watches: ["Watch", "Sport Watch", "Classic Watch"],
  Perfumes: ["Perfume", "Eau de Parfum", "Body Mist"],
  "Skin Care": ["Face Wash", "Moisturizer", "Serum"],
  "Hair Care": ["Shampoo", "Conditioner", "Hair Mask"],
};

const STATUS_POOL = [
  "Pending",
  "Prepared",
  "Shipped",
  "Delivered",
  "CancelledByUser",
  "CancelledByAdmin",
  "Rejected",
];
const STATUS_WEIGHTS = [0.09, 0.1, 0.12, 0.48, 0.08, 0.08, 0.05];
const ACTIVE_STOCK_STATUSES = new Set([
  "Pending",
  "Prepared",
  "Shipped",
  "Delivered",
]);

const parseArgs = () => {
  const options = { ...DEFAULT_COUNTS, append: false };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--append") {
      options.append = true;
      continue;
    }

    if (!arg.startsWith("--")) continue;

    const [rawKey, rawValue] = arg.slice(2).split("=");
    if (!rawKey || rawValue == null) continue;

    const value = Number(rawValue);
    if (Number.isNaN(value)) continue;

    if (rawKey in options) options[rawKey] = Math.max(0, Math.floor(value));
  }

  return options;
};

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickOne = (arr) => arr[randomInt(0, arr.length - 1)];

const sampleSize = (arr, count) => {
  const copy = [...arr];
  const selected = [];

  while (copy.length > 0 && selected.length < count) {
    selected.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
  }

  return selected;
};

const weightedPick = (values, weights) => {
  const r = Math.random();
  let acc = 0;

  for (let i = 0; i < values.length; i += 1) {
    acc += weights[i];
    if (r <= acc) return values[i];
  }

  return values[values.length - 1];
};

const buildAddress = () =>
  `${randomInt(2, 230)} ${pickOne(["Street", "Road", "Avenue"])} ${pickOne(
    DISTRICTS,
  )}, ${pickOne(CITIES)}`;

const buildProductName = (subName, index) => {
  const titles = SUBCATEGORY_TITLES[subName] || ["Item"];
  return `${pickOne(ADJECTIVES)} ${pickOne(titles)} ${pickOne(MATERIALS)} ${pickOne(
    COLORS,
  )} ${index}`;
};

const buildReviewText = (rating) => {
  if (rating >= 4) {
    return "Very good quality and delivery was fast. The product looked exactly like the photos.";
  }

  if (rating === 3) {
    return "Good overall experience, but I hope the sizing details become more clear in the product page.";
  }

  return "The product is acceptable, but shipping took longer than expected and packaging can be improved.";
};

const clearCollections = async () => {
  await Promise.all([
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Testimonial.deleteMany({}),
    Product.deleteMany({}),
    Subcategory.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
    StaticContent.deleteMany({}),
  ]);
};

const seedCategories = async () => {
  const categories = [];
  const subcategories = [];

  for (const cat of CATEGORY_BLUEPRINT) {
    let category = await Category.findOne({ name: cat.name });
    if (!category) {
      category = await Category.create({
        name: cat.name,
        slug: generateSlug(cat.name),
        isActive: true,
      });
    }

    categories.push(category);

    for (const subName of cat.subs) {
      const exists = await Subcategory.findOne({
        name: subName,
        category: category._id,
      });

      if (exists) {
        subcategories.push(exists);
      } else {
        const created = await Subcategory.create({
          name: subName,
          slug: generateSlug(`${cat.name}-${subName}`),
          category: category._id,
          isActive: true,
        });
        subcategories.push(created);
      }
    }
  }

  return { categories, subcategories };
};

const seedUsers = async (count) => {
  const users = [];
  const existingEmails = new Set(
    (await User.find({}, "email").lean()).map((u) => u.email),
  );
  const existingPhones = new Set(
    (await User.find({}, "phone").lean()).map((u) => u.phone),
  );
  const runPrefix = Date.now();

  for (let i = 0; i < count; i += 1) {
    const gender = Math.random() > 0.5 ? "male" : "female";
    const firstName =
      gender === "male"
        ? pickOne(MALE_FIRST_NAMES)
        : pickOne(FEMALE_FIRST_NAMES);
    const fullName = `${firstName} ${pickOne(LAST_NAMES)}`;
    let email = `user${runPrefix}${String(i + 1).padStart(4, "0")}@youthes.seed`;
    let phone = `01${String((runPrefix + i) % 1000000000).padStart(9, "0")}`;
    let attempt = 1;

    while (existingEmails.has(email)) {
      email = `user${runPrefix}${String(i + 1).padStart(4, "0")}${attempt}@youthes.seed`;
      attempt += 1;
    }

    attempt = 1;
    while (existingPhones.has(phone)) {
      phone = `01${String((runPrefix + i + attempt) % 1000000000).padStart(9, "0")}`;
      attempt += 1;
    }

    existingEmails.add(email);
    existingPhones.add(phone);

    users.push({
      fullName,
      email,
      phone,
      password: await bcrypt.hash("Pass12345!", 12),
      gender,
      address: buildAddress(),
      role: i < 3 ? "admin" : "user",
      isActive: Math.random() > 0.05,
    });
  }

  return User.insertMany(users);
};

const seedProducts = async (count, subcategories) => {
  const products = [];

  for (let i = 0; i < count; i += 1) {
    const sub = pickOne(subcategories);
    const price = randomInt(120, 3900);
    const stockCount = Math.random() > 0.08 ? randomInt(3, 120) : 0;
    const name = buildProductName(sub.name, i + 1);

    products.push({
      name,
      slug: generateSlug(name),
      description:
        "High quality item with comfortable fit and durable finishing. Suitable for daily use and special occasions.",
      price,
      image: `seed-product-${String(i + 1).padStart(4, "0")}.jpg`,
      category: sub.category,
      subcategory: sub._id,
      stockCount,
      isDeleted: Math.random() < 0.03,
    });
  }

  return Product.insertMany(products);
};

const seedCarts = async (count, users, products) => {
  const shoppers = users.filter((u) => u.role === "user" && u.isActive);
  const existingCarts = await Cart.find({
    user: { $in: shoppers.map((u) => u._id) },
  })
    .select("user")
    .lean();
  const existingUserSet = new Set(existingCarts.map((c) => c.user.toString()));
  const cartEligibleUsers = shoppers.filter(
    (u) => !existingUserSet.has(u._id.toString()),
  );
  const targetUsers = sampleSize(
    cartEligibleUsers,
    Math.min(count, cartEligibleUsers.length),
  );
  const availableProducts = products.filter((p) => !p.isDeleted);

  const carts = targetUsers.map((user) => {
    const itemsCount = randomInt(1, 5);
    const itemsProducts = sampleSize(availableProducts, itemsCount);

    return {
      user: user._id,
      items: itemsProducts.map((product) => ({
        product: product._id,
        quantity: randomInt(1, 3),
        priceAtAdd: product.price,
      })),
    };
  });

  if (carts.length === 0) return [];
  return Cart.insertMany(carts);
};

const seedOrders = async (count, users, products) => {
  const validProducts = products.filter((p) => !p.isDeleted);
  const stockMap = new Map(
    validProducts.map((p) => [p._id.toString(), p.stockCount]),
  );
  const shoppers = users.filter((u) => u.role === "user");
  if (shoppers.length === 0 || validProducts.length === 0 || count === 0)
    return [];
  const shippingFee = Number(env.shippingFee) || 0;
  const orders = [];

  for (let i = 0; i < count; i += 1) {
    const user = pickOne(shoppers);
    let status = weightedPick(STATUS_POOL, STATUS_WEIGHTS);
    const needsStock = ACTIVE_STOCK_STATUSES.has(status);

    const items = [];
    const selectedProducts = sampleSize(validProducts, randomInt(1, 4));

    for (const product of selectedProducts) {
      const remainingStock = stockMap.get(product._id.toString()) ?? 0;
      let maxQty = 4;

      if (needsStock) {
        if (remainingStock <= 0) continue;
        maxQty = Math.min(maxQty, remainingStock);
      }

      const quantity = randomInt(1, Math.max(1, maxQty));
      const unitPrice = Math.max(
        50,
        Math.round(product.price * (0.9 + Math.random() * 0.2)),
      );

      items.push({
        productId: product._id,
        productName: product.name,
        productImage: product.image,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      });

      if (needsStock) {
        stockMap.set(product._id.toString(), remainingStock - quantity);
      }
    }

    if (items.length === 0) {
      status = "CancelledByUser";
      const fallback = pickOne(validProducts);
      const quantity = randomInt(1, 2);
      items.push({
        productId: fallback._id,
        productName: fallback.name,
        productImage: fallback.image,
        unitPrice: fallback.price,
        quantity,
        subtotal: fallback.price * quantity,
      });
    }

    const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    orders.push({
      orderNumber: `ORD-${Date.now()}-${String(i + 1).padStart(5, "0")}`,
      user: user._id,
      items,
      deliveryPhone: user.phone,
      deliveryAddress: user.address || buildAddress(),
      shippingFee,
      totalAmount: itemsTotal + shippingFee,
      paymentMethod: "COD",
      status,
      ...(status === "CancelledByUser" && {
        cancelledBy: "user",
        cancellationReason:
          "Customer requested cancellation before preparation.",
      }),
      ...(status === "CancelledByAdmin" && {
        cancelledBy: "admin",
        cancellationReason:
          "Cancelled due to inventory mismatch during review.",
      }),
      ...(status === "Rejected" && {
        cancellationReason: "Order rejected due to invalid delivery details.",
      }),
    });
  }

  const insertedOrders = await Order.insertMany(orders);

  for (const product of validProducts) {
    const nextStock = stockMap.get(product._id.toString());
    if (typeof nextStock === "number")
      product.stockCount = Math.max(0, nextStock);
  }

  await Product.bulkSave(validProducts);
  return insertedOrders;
};

const seedTestimonials = async (count, users) => {
  const activeUsers = users.filter((u) => u.role === "user" && u.isActive);
  if (activeUsers.length === 0 || count === 0) return [];
  const statuses = [
    "approved",
    "approved",
    "approved",
    "pending",
    "rejected",
    "ignored",
  ];

  const docs = Array.from({ length: count }, () => {
    const user = pickOne(activeUsers);
    const rating = weightedPick([1, 2, 3, 4, 5], [0.04, 0.07, 0.14, 0.3, 0.45]);

    return {
      user: user._id,
      userName: user.fullName,
      reviewText: buildReviewText(rating),
      rating,
      status: pickOne(statuses),
    };
  });

  return Testimonial.insertMany(docs);
};

const seedStaticContent = async () => {
  await StaticContent.bulkWrite([
    {
      updateOne: {
        filter: { pageKey: "about_us" },
        update: {
          $set: {
            pageKey: "about_us",
            content: {
              heroTitle: "About Youthes",
              shortIntro:
                "Youthes is a lifestyle e-commerce brand focused on affordable quality and smooth delivery.",
              highlights: [
                "Curated products for daily style and essentials.",
                "Fast local shipping with transparent order tracking.",
                "Dedicated support for returns and post-purchase help.",
              ],
            },
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { pageKey: "faq" },
        update: {
          $set: {
            pageKey: "faq",
            content: [
              {
                question: "How long does delivery take?",
                answer:
                  "Orders are usually delivered within 2 to 5 business days depending on location.",
              },
              {
                question: "Can I return a product?",
                answer:
                  "Yes, returns are supported within the return window if product conditions are met.",
              },
              {
                question: "Which payment methods are available?",
                answer: "Currently, cash on delivery is supported.",
              },
            ],
          },
        },
        upsert: true,
      },
    },
  ]);
};

const run = async () => {
  const config = parseArgs();
  await mongoose.connect(env.mongodbUri);
  console.log("Connected to MongoDB");

  if (!config.append) {
    await clearCollections();
    console.log("Old data cleared");
  }

  const { subcategories } = await seedCategories();
  console.log(`Seeded categories and ${subcategories.length} subcategories`);

  const users = await seedUsers(config.users);
  console.log(`Seeded ${users.length} users`);

  const products = await seedProducts(config.products, subcategories);
  console.log(`Seeded ${products.length} products`);

  const carts = await seedCarts(config.carts, users, products);
  console.log(`Seeded ${carts.length} carts`);

  const orders = await seedOrders(config.orders, users, products);
  console.log(`Seeded ${orders.length} orders`);

  const testimonials = await seedTestimonials(config.testimonials, users);
  console.log(`Seeded ${testimonials.length} testimonials`);

  await seedStaticContent();
  console.log("Seeded static content");

  await mongoose.disconnect();
  console.log("Seeding completed successfully");
};

run().catch(async (error) => {
  console.error("Seeding failed:", error);
  try {
    await mongoose.disconnect();
  } catch (_err) {}
  process.exit(1);
});
