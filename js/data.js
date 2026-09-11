// SASI Steel Engineering - Central Service & Category Database
const servicesData = [
  {
    id: "steel-fabrication",
    name: "Steel Fabrication",
    category: "Steel Fabrication",
    categorySlug: "steel-fabrication",
    price: 5000,
    priceFormatted: "₹5,000",
    unit: "per ton / structural unit",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    icon: "fa-industry",
    badge: "Structural",
    shortDescription: "Complete structural steel fabrication for warehouses, industrial sheds, and PEB buildings.",
    detailedDescription: "SASI Steel Engineering delivers heavy-duty, high-precision industrial steel fabrication services for commercial buildings, manufacturing plants, and heavy engineering projects. We utilize high-tensile structural steel, advanced CNC cutting, and certified assembly techniques to ensure maximum structural integrity and compliance with Indian & international safety standards.",
    features: [
      "High tensile IS 2062 Grade steel construction",
      "CNC precision plasma & oxy-fuel beam cutting",
      "Heavy load bearing capacity with FEA verification",
      "Corrosion-resistant epoxy primer coating",
      "Custom engineered to client architectural blueprints",
      "On-site erection and quality inspection included"
    ],
    specifications: {
      "Material Grade": "IS 2062 / ASTM A36 Steel",
      "Tolerance": "± 1.0 mm precision",
      "Finish": "Anti-corrosive Red Oxide / Epoxy Zinc",
      "Application": "Industrial Sheds, Warehouses, Pre-Engineered Buildings",
      "Standard Lead Time": "5 - 10 Business Days"
    }
  },
  {
    id: "welding-works",
    name: "Welding Works",
    category: "Welding Works",
    categorySlug: "welding-works",
    price: 2500,
    priceFormatted: "₹2,500",
    unit: "per meter / joint assembly",
    image: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
    icon: "fa-fire-burner",
    badge: "Certified",
    shortDescription: "Professional welding works for strong, durable, and reliable steel structures & pipelines.",
    detailedDescription: "Our certified welding technicians provide specialized TIG, MIG, and SMAW (Arc) welding solutions for heavy-duty structural steel, pressure vessels, pipelines, and architectural ironwork. Every weld undergoes visual and ultrasonic testing to guarantee zero porosity, deep penetration, and superior joint resilience.",
    features: [
      "Certified AWS / ASME D1.1 welders",
      "MIG, TIG, Submerged Arc & Stick welding capabilities",
      "Non-Destructive Testing (NDT) & Ultrasonic validation",
      "Heavy gauge structural & pipe joint welding",
      "Seamless clean grinding and polishing available",
      "Emergency repair and on-site welding mobile units"
    ],
    specifications: {
      "Welding Processes": "MIG (GMAW), TIG (GTAW), Stick (SMAW)",
      "Inspection": "NDT, Ultrasonic & Dye Penetrant testing",
      "Joint Type": "Butt, Lap, Tee, Corner & Edge joints",
      "Application": "Structural trusses, crane girders, pressure piping",
      "Standard Lead Time": "2 - 5 Business Days"
    }
  },
  {
    id: "storage-racks",
    name: "Storage Racks & Shelving",
    category: "Storage and Racks",
    categorySlug: "storage-and-racks",
    price: 4000,
    priceFormatted: "₹4,000",
    unit: "per bay / shelf tier",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    icon: "fa-boxes-stacked",
    badge: "Heavy Duty",
    shortDescription: "Custom steel storage racks, heavy-duty warehouse pallet shelving, and cantilever systems.",
    detailedDescription: "Optimize your warehouse and factory floor space with custom-engineered industrial pallet racking, cantilever racks, heavy-duty shelving, and drive-in storage systems. Built with cold-formed structural steel profiles, our racks deliver extreme load capacities, easy adjustability, and maximum seismic stability.",
    features: [
      "Heavy load rating up to 3,500 kg per level",
      "Modular boltless or heavy-duty bolted design",
      "Scratch-resistant electrostatic powder coating",
      "Custom pallet sizes & cantilever arms for long stock",
      "Integrated safety locking pins & column protectors",
      "Complete warehouse layout CAD design assistance"
    ],
    specifications: {
      "Load Capacity": "500 kg to 3,500 kg per beam level",
      "Coating": "Electrostatically applied powder coat",
      "Material": "Cold Rolled Steel (CR) & Hot Rolled (HR)",
      "Application": "Logistics Warehouses, Cold Storages, Retail Backrooms",
      "Standard Lead Time": "4 - 7 Business Days"
    }
  },
  {
    id: "mezzanine-floors",
    name: "Mezzanine Floors & Structures",
    category: "Mezzanine Floors and Structure",
    categorySlug: "mezzanine-floors-and-structure",
    price: 15000,
    priceFormatted: "₹15,000",
    unit: "per 100 sq.ft module",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    icon: "fa-layer-group",
    badge: "Space Saver",
    shortDescription: "Strong and customized mezzanine floors, multi-tier platforms, and steel structural expansions.",
    detailedDescription: "Double or triple your usable industrial floor space without expensive civil building expansion. SASI Steel Engineering manufactures heavy structural steel mezzanine platforms, complete with universal columns, I-beam main bearers, chequered steel/decking panels, industrial safety staircases, kickplates, and heavy handrails.",
    features: [
      "Custom span designs without obstructive intermediate columns",
      "Load ratings up to 1000 kg/m² for machinery or storage",
      "Turnkey installation including stairs, handrails & pallet gates",
      "Durable chequered steel plate or plywood/cement flooring",
      "Engineered structural calculations and safety approvals",
      "Disassembleable and relocatable modular design"
    ],
    specifications: {
      "Column Support": "Heavy hollow section (SHS/RHS) or ISMB Columns",
      "Flooring Options": "Chequered Plate 3-5mm, Gratings, Cement Board",
      "Safety": "Standard OSHA / IS compliance railings & kickplates",
      "Application": "Factory expansions, Office-over-production, Storage decks",
      "Standard Lead Time": "10 - 15 Business Days"
    }
  },
  {
    id: "custom-fabrication",
    name: "Custom Fabrications",
    category: "Custom Fabrication",
    categorySlug: "custom-fabrication",
    price: 7500,
    priceFormatted: "₹7,500",
    unit: "per customized assembly",
    image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    icon: "fa-gears",
    badge: "Custom CAD",
    shortDescription: "Customized steel fabrication and precision assembly designed to exact client blueprints.",
    detailedDescription: "Have a unique industrial or architectural engineering project? SASI Steel Engineering specializes in bespoke custom fabrication for prototypes, specialty machine chassis, hopper tanks, steel staircases, decorative gates, canopies, and industrial ductwork. We translate rough sketches or CAD drawings into precision-built steel realities.",
    features: [
      "Bespoke manufacturing from 3D CAD or client sketches",
      "Multi-metal fabrication (Mild Steel, Stainless Steel, Galvanized)",
      "High precision CNC bending, rolling, punching, and shearing",
      "Prototyping through to high-volume production runs",
      "Custom finishing (Hot-dip galvanizing, powder coating, painting)",
      "Dedicated fabrication engineer assigned to your project"
    ],
    specifications: {
      "Metals Supported": "Mild Steel (MS), Stainless Steel (SS304/316), Galvanized Steel (GI)",
      "Capabilities": "Laser cutting, Press brake bending, Profile rolling, Machining",
      "Precision": "Up to 0.5 mm tolerances",
      "Application": "Specialty Machinery, Hoppers, Enclosures, Architectural Art",
      "Standard Lead Time": "7 - 12 Business Days"
    }
  }
];

const categoriesData = [
  {
    slug: "steel-fabrication",
    name: "Steel Fabrication",
    count: "12+ Solutions",
    description: "Heavy structural beams, industrial PEB sheds, trusses, and load-bearing steel frameworks.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
    startingPrice: "₹5,000",
    icon: "fa-industry"
  },
  {
    slug: "welding-works",
    name: "Welding Works",
    count: "8+ Specializations",
    description: "Certified MIG, TIG, and Arc welding for heavy structural joints, piping, and repairs.",
    image: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
    startingPrice: "₹2,500",
    icon: "fa-fire-burner"
  },
  {
    slug: "storage-and-racks",
    name: "Storage Racks & Shelving",
    count: "15+ Configurations",
    description: "High-density warehouse pallet racks, cantilever arms, multi-tier shelving, and bin systems.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    startingPrice: "₹4,000",
    icon: "fa-boxes-stacked"
  },
  {
    slug: "mezzanine-floors-and-structure",
    name: "Mezzanine Floors & Structures",
    count: "6+ Structural Types",
    description: "Free-standing multi-tier industrial mezzanine platforms, walkways, and access stairs.",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    startingPrice: "₹15,000",
    icon: "fa-layer-group"
  },
  {
    slug: "custom-fabrication",
    name: "Custom Fabrications",
    count: "Unlimited Options",
    description: "Bespoke steel equipment, machine frames, tanks, architectural elements, and custom enclosures.",
    image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    startingPrice: "₹7,500",
    icon: "fa-gears"
  }
];
