require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const env = require("../config/environment");
const generateSlug = require("../utils/slugGenerator");
const { Category, Subcategory } = require("../models/Category");
const Product = require("../models/Product");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Page = require("../models/Page");

const DEFAULTS = {
  users: 120,
  products: 400,
  orders: 260,
  carts: 75,
  reviews: 160,
};

const CATEGORIES = [
  { name: "Women's Fashion", subs: ["Dresses", "Blouses", "Trousers", "Skirts", "Blazers"] },
  { name: "Men's Apparel", subs: ["T-Shirts", "Button Shirts", "Chinos", "Hoodies", "Leather Jackets"] },
  { name: "Footwear", subs: ["Athletic Shoes", "Loafers", "Oxfords", "Boots", "Sandals"] },
  { name: "Accessories", subs: ["Handbags", "Leather Belts", "Sunglasses", "Wristwatches", "Scarves"] },
  { name: "Beauty", subs: ["Fragrances", "Skincare", "Haircare", "Makeup", "Bath & Body"] },
];

const generateUniqueProducts = (count, subcategories) => {
  const products = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    const sub = pick(subcategories);
    let title;
    
    do {
      const style = faker.commerce.productAdjective();
      const material = faker.commerce.productMaterial();
      const color = faker.color.human();
      const descriptor = faker.commerce.productName().split(" ")[0];
      title = `${style} ${descriptor} ${material} ${color}`.substring(0, 80);
    } while (usedNames.has(title));
    
    usedNames.add(title);
    
    products.push({
      title,
      slug: generateSlug(title),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 150, max: 4500, dec: 0 })),
      image: `product-${faker.string.uuid()}.jpg`,
      category: sub.category,
      subcategory: sub._id,
      stock: faker.number.int({ min: 0, max: 250 }),
      deleted: Math.random() < 0.03,
    });
  }
  
  return products;
};

const generateUniqueUsers = async (count) => {
  const users = [];
  const existingEmails = new Set();
  const existingPhones = new Set();
  
  for (let i = 0; i < count; i++) {
    const gender = faker.person.sex();
    let email;
    let phone;
    
    do {
      email = faker.internet.email().toLowerCase();
    } while (existingEmails.has(email));
    
    do {
      phone = faker.phone.number({ style: 'international' }).replace(/\D/g, '').slice(0, 15);
    } while (existingPhones.has(phone));
    
    existingEmails.add(email);
    existingPhones.add(phone);
    
    users.push({
      name: faker.person.fullName({ sex: gender }),
      email,
      mobile: phone,
      password: await bcrypt.hash("Pass12345!", 12),
      gender: gender === 'female' ? 'female' : 'male',
      address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.country()}`,
      role: i < 3 ? "admin" : "user",
      active: Math.random() > 0.05,
    });
  }
  
  return User.insertMany(users);
};

const generateUniqueCarts = (count, users, products) => {
  const shoppers = users.filter(u => u.role === "user" && u.active);
  const availableProducts = products.filter(p => !p.deleted);
  const carts = [];
  const usedUsers = new Set();
  
  for (let i = 0; i < Math.min(count, shoppers.length); i++) {
    let user;
    do {
      user = pick(shoppers);
    } while (usedUsers.has(user._id.toString()));
    
    usedUsers.add(user._id.toString());
    
    const itemsCount = faker.number.int({ min: 1, max: 6 });
    const selectedProducts = [];
    const usedProducts = new Set();
    
    for (let j = 0; j < itemsCount; j++) {
      let product;
      do {
        product = pick(availableProducts);
      } while (usedProducts.has(product._id.toString()));
      
      usedProducts.add(product._id.toString());
      selectedProducts.push(product);
    }
    
    carts.push({
      user: user._id,
      items: selectedProducts.map(product => ({
        product: product._id,
        quantity: faker.number.int({ min: 1, max: 4 }),
        priceAtAdd: product.price,
      })),
    });
  }
  
  return Cart.insertMany(carts);
};

const generateUniqueOrders = async (count, users, products) => {
  const validProducts = products.filter(p => !p.deleted);
  const shoppers = users.filter(u => u.role === "user");
  if (shoppers.length === 0 || validProducts.length === 0 || count === 0) return [];
  
  const shipping = Number(env.shippingCost) || 0;
  const orders = [];
  const usedOrderNumbers = new Set();
  
  for (let i = 0; i < count; i++) {
    const user = pick(shoppers);
    let status = weightedPick(STATUS_LIST, STATUS_WEIGHTS);
    const needsStock = ACTIVE_STATUSES.has(status);
    
    const items = [];
    const itemsCount = faker.number.int({ min: 1, max: 5 });
    const selectedProducts = [];
    const usedProducts = new Set();
    
    for (let j = 0; j < itemsCount; j++) {
      let product;
      do {
        product = pick(validProducts);
      } while (usedProducts.has(product._id.toString()));
      
      usedProducts.add(product._id.toString());
      selectedProducts.push(product);
    }
    
    for (const product of selectedProducts) {
      const qty = needsStock 
        ? faker.number.int({ min: 1, max: Math.min(3, product.stock || 3) })
        : faker.number.int({ min: 1, max: 3 });
      
      const unitPrice = parseFloat(faker.commerce.price({ min: 100, max: 5000, dec: 0 }));
      
      items.push({
        productId: product._id,
        productName: product.title,
        productImage: product.image,
        unitPrice,
        quantity: qty,
        subtotal: unitPrice * qty,
      });
    }
    
    if (items.length === 0) {
      status = "CancelledByUser";
      const fallback = pick(validProducts);
      items.push({
        productId: fallback._id,
        productName: fallback.title,
        productImage: fallback.image,
        unitPrice: fallback.price,
        quantity: 1,
        subtotal: fallback.price,
      });
    }
    
    const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    let orderNumber;
    
    do {
      orderNumber = `ORD-${faker.string.alphanumeric(8).toUpperCase()}`;
    } while (usedOrderNumbers.has(orderNumber));
    
    usedOrderNumbers.add(orderNumber);
    
    orders.push({
      orderNumber,
      user: user._id,
      items,
      phone: user.mobile,
      address: user.address || faker.location.streetAddress(),
      shippingCost: shipping,
      totalAmount: itemsTotal + shipping,
      paymentMethod: "COD",
      status,
      ...(status === "CancelledByUser" && {
        cancelledBy: "user",
        cancelReason: faker.helpers.arrayElement([
          "Changed my mind",
          "Found better price elsewhere",
          "Ordered by mistake"
        ]),
      }),
      ...(status === "CancelledByAdmin" && {
        cancelledBy: "admin",
        cancelReason: faker.helpers.arrayElement([
          "Out of stock",
          "Payment verification failed",
          "Suspicious activity detected"
        ]),
      }),
      ...(status === "Rejected" && {
        cancelReason: faker.helpers.arrayElement([
          "Invalid address",
          "Unable to verify phone number",
          "Delivery area not covered"
        ]),
      }),
      createdAt: faker.date.between({ from: '2024-01-01', to: new Date() }),
    });
  }
  
  return Order.insertMany(orders);
};

const generateUniqueReviews = (count, users) => {
  const activeUsers = users.filter(u => u.role === "user" && u.active);
  if (activeUsers.length === 0 || count === 0) return [];
  
  const reviews = [];
  const usedUsers = new Set();
  const statuses = ["approved", "approved", "approved", "pending", "rejected"];
  
  for (let i = 0; i < Math.min(count, activeUsers.length); i++) {
    let user;
    do {
      user = pick(activeUsers);
    } while (usedUsers.has(user._id.toString()));
    
    usedUsers.add(user._id.toString());
    const rating = weightedPick([1, 2, 3, 4, 5], [0.05, 0.1, 0.15, 0.3, 0.4]);
    
    reviews.push({
      user: user._id,
      userName: user.name,
      comment: generateReviewText(rating),
      rating,
      status: pick(statuses),
      createdAt: faker.date.between({ from: '2024-01-01', to: new Date() }),
    });
  }
  
  return Review.insertMany(reviews);
};

const generateReviewText = (rating) => {
  const texts = {
    5: [
      "Absolutely perfect! Exceeded all expectations.",
      "Best purchase I've made this year. Highly recommend!",
      "Outstanding quality and fast shipping. Will buy again.",
      "Exactly as described. Very satisfied with the product."
    ],
    4: [
      "Great product, minor issue with packaging but overall good.",
      "Very happy with the purchase. Slightly delayed delivery.",
      "Good quality, matches description. Would recommend."
    ],
    3: [
      "Average product. Nothing special but does the job.",
      "Okay quality, shipping took longer than expected.",
      "Decent for the price, but expected better."
    ],
    2: [
      "Not what I expected. Quality could be better.",
      "Disappointed with the product. Doesn't match photos.",
      "Poor quality control. Had to return."
    ],
    1: [
      "Terrible experience. Would not recommend.",
      "Complete waste of money. Product arrived damaged.",
      "Very dissatisfied. Customer service unhelpful."
    ]
  };
  
  const ratingTexts = texts[rating] || texts[3];
  return faker.helpers.arrayElement(ratingTexts);
};

const parseArgs = () => {
  const options = { ...DEFAULTS, append: false };

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

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weightedPick = (values, weights) => {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    acc += weights[i];
    if (r <= acc) return values[i];
  }
  return values[values.length - 1];
};

const STATUS_LIST = ["Pending", "Prepared", "Shipped", "Delivered", "CancelledByUser", "CancelledByAdmin", "Rejected"];
const STATUS_WEIGHTS = [0.08, 0.1, 0.12, 0.5, 0.07, 0.07, 0.06];
const ACTIVE_STATUSES = new Set(["Pending", "Prepared", "Shipped", "Delivered"]);

const clearCollections = async () => {
  await Promise.all([
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Review.deleteMany({}),
    Product.deleteMany({}),
    Subcategory.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
    Page.deleteMany({}),
  ]);
};

const seedCategories = async () => {
  const categories = [];
  const subcategories = [];

  for (const cat of CATEGORIES) {
    let category = await Category.findOne({ name: cat.name });
    if (!category) {
      category = await Category.create({
        name: cat.name,
        slug: generateSlug(cat.name),
        active: true,
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
          active: true,
        });
        subcategories.push(created);
      }
    }
  }

  return { categories, subcategories };
};

const seedPages = async () => {
  await Page.bulkWrite([
    {
      updateOne: {
        filter: { key: "about_us" },
        update: {
          $set: {
            key: "about_us",
            content: {
              title: "About Our Store",
              intro: "We're passionate about bringing you the finest products with exceptional service.",
              highlights: [
                "Curated selection of premium products",
                "Fast and reliable delivery across the country",
                "24/7 customer support for all your needs",
                "Easy returns and exchange policy"
              ],
              story: "Founded in 2024, we've grown from a small local shop to serving customers nationwide."
            },
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { key: "faq" },
        update: {
          $set: {
            key: "faq",
            content: [
              {
                question: "What is your shipping policy?",
                answer: "We offer free shipping on orders over $100. Standard shipping takes 3-5 business days, express shipping takes 1-2 business days.",
              },
              {
                question: "How do I track my order?",
                answer: "Once your order ships, you'll receive a tracking number via email to monitor your delivery status.",
              },
              {
                question: "What is your return policy?",
                answer: "We accept returns within 30 days of purchase for unworn, unwashed items with original tags attached.",
              },
              {
                question: "Do you ship internationally?",
                answer: "Currently, we only ship within the country. We're working on expanding internationally soon.",
              },
              {
                question: "How can I contact customer service?",
                answer: "You can reach us via email at support@store.com or call us at +1 (555) 123-4567, Monday-Friday 9am-6pm.",
              },
            ],
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { key: "contact_us" },
        update: {
          $set: {
            key: "contact_us",
            content: {
              phone: faker.phone.number({ style: 'international' }),
              email: "support@store.com",
              address: faker.location.streetAddress(),
              hours: "Monday-Friday: 9:00 AM - 6:00 PM, Saturday: 10:00 AM - 4:00 PM, Sunday: Closed",
              social: {
                facebook: "https://facebook.com/store",
                instagram: "https://instagram.com/store",
                twitter: "https://twitter.com/store",
              },
            },
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
    console.log("Cleared existing data");
  }

  const { subcategories } = await seedCategories();
  console.log(`Created ${subcategories.length} subcategories`);

  const users = await generateUniqueUsers(config.users);
  console.log(`Created ${users.length} users`);

  const products = await Product.insertMany(generateUniqueProducts(config.products, subcategories));
  console.log(`Created ${products.length} products`);

  const carts = await generateUniqueCarts(config.carts, users, products);
  console.log(`Created ${carts.length} carts`);

  const orders = await generateUniqueOrders(config.orders, users, products);
  console.log(`Created ${orders.length} orders`);

  const reviews = await generateUniqueReviews(config.reviews, users);
  console.log(`Created ${reviews.length} reviews`);

  await seedPages();
  console.log("Created static pages");

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