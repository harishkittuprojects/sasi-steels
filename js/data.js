// SASI Steel Engineering - Central Database

// 1. Services Database
const servicesData = [
  {
    id: "steel-fabrication",
    name: "Steel Fabrication",
    category: "Steel Fabrication",
    categorySlug: "steel-fabrication",
    price: 5000,
    priceFormatted: "₹5,000",
    unit: "per ton / structural unit",
    image: "steel-fabrication.jpg",
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
    image: "welding-works.jpg",
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
    image: "storage-racks.jpg",
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
    image: "mezzanine-floors.jpg",
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
    image: "custom-fabrication.jpg",
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
  },
  {
    id: "industrial-roofing-sheds",
    name: "Industrial Roofing & PEB Sheds",
    category: "Steel Fabrication",
    categorySlug: "steel-fabrication",
    price: 8500,
    priceFormatted: "₹8,500",
    unit: "per 100 sq.ft covered area",
    image: "industrial-roofing-sheds.jpg",
    icon: "fa-warehouse",
    badge: "Turnkey PEB",
    shortDescription: "Heavy-duty pre-engineered steel buildings, warehouse trusses, and industrial sheet roofing solutions.",
    detailedDescription: "SASI Steel Engineering designs, fabricates, and erects turnkey Pre-Engineered Buildings (PEB), factory sheds, industrial roofing trusses, and standing seam steel roofing. Built to endure extreme wind loads and harsh weather, our roofing systems provide expansive clear spans and long-lasting galvanized durability.",
    features: [
      "Clear span structural steel truss framing",
      "Galvalume / Color-coated corrugated roofing sheets",
      "High wind resistance design compliant with IS 875",
      "Integrated turbo ventilators and translucent sky-lighting",
      "Complete rainwater gutter and downpipe drainage system",
      "Fast on-site assembly with zero disruption"
    ],
    specifications: {
      "Truss Material": "IS 2062 Grade Structural Steel / Tubular Sections",
      "Roofing Sheet": "0.5mm Galvalume / Color Coated AZ-150",
      "Wind Speed Design": "Up to 180 km/h load rated",
      "Application": "Industrial Factories, Warehouses, Workshops, Aircraft Hangars",
      "Standard Lead Time": "8 - 14 Business Days"
    }
  }
];

// 2. Categories Database
const categoriesData = [
  {
    slug: "steel-fabrication",
    name: "Steel Fabrication",
    count: "12+ Solutions",
    description: "Heavy structural beams, industrial PEB sheds, trusses, and load-bearing steel frameworks.",
    image: "steel-fabrication.jpg",
    startingPrice: "₹5,000",
    icon: "fa-industry"
  },
  {
    slug: "welding-works",
    name: "Welding Works",
    count: "8+ Specializations",
    description: "Certified MIG, TIG, and Arc welding for heavy structural joints, piping, and repairs.",
    image: "welding-works.jpg",
    startingPrice: "₹2,500",
    icon: "fa-fire-burner"
  },
  {
    slug: "storage-and-racks",
    name: "Storage Racks & Shelving",
    count: "15+ Configurations",
    description: "High-density warehouse pallet racks, cantilever arms, multi-tier shelving, and bin systems.",
    image: "storage-racks.jpg",
    startingPrice: "₹4,000",
    icon: "fa-boxes-stacked"
  },
  {
    slug: "mezzanine-floors-and-structure",
    name: "Mezzanine Floors & Structures",
    count: "6+ Structural Types",
    description: "Free-standing multi-tier industrial mezzanine platforms, walkways, and access stairs.",
    image: "mezzanine-floors.jpg",
    startingPrice: "₹15,000",
    icon: "fa-layer-group"
  },
  {
    slug: "custom-fabrication",
    name: "Custom Fabrications",
    count: "Unlimited Options",
    description: "Bespoke steel equipment, machine frames, tanks, architectural elements, and custom enclosures.",
    image: "custom-fabrication.jpg",
    startingPrice: "₹7,500",
    icon: "fa-gears"
  }
];

// 3. Products Database
const productsData = [
  {
    id: "heavy-ismb-beams",
    name: "Structural ISMB Steel Beams & Columns",
    category: "Structural Steel",
    categorySlug: "structural-steel",
    priceFormatted: "₹65 / kg",
    rating: "4.9 (42 reviews)",
    image: "product-beams.jpg",
    badge: "IS 2062 Standard",
    specs: "ISMB 100 to 600mm | Length: 6m - 12m | Anti-Rust Primer",
    description: "High tensile hot-rolled universal I-beams, H-columns, and structural channels engineered for heavy load foundations, warehouse frames, and bridge spans."
  },
  {
    id: "industrial-pallet-racks",
    name: "Heavy-Duty Warehouse Pallet Racks",
    category: "Storage Systems",
    categorySlug: "storage-systems",
    priceFormatted: "₹4,200 / bay level",
    rating: "5.0 (58 reviews)",
    image: "product-racks.jpg",
    badge: "3.5 Ton Capacity",
    specs: "Upright Height: 2m to 10m | Beam Length: 2.7m | Powder Coated",
    description: "Multi-tier selective pallet racking systems engineered for forklift loading, high-density warehousing, and extreme seismic resistance."
  },
  {
    id: "galvalume-roofing-sheets",
    name: "Galvalume Corrugated Roofing Sheets",
    category: "PEB & Roofing",
    categorySlug: "peb-roofing",
    priceFormatted: "₹380 / sq.meter",
    rating: "4.8 (39 reviews)",
    image: "product-sheets.jpg",
    badge: "AZ-150 Coating",
    specs: "Thickness: 0.45 - 0.60 mm | Color Coated | Wind Tested",
    description: "Weather-resistant, corrosion-proof profiled steel roofing and wall cladding sheets for industrial factory sheds and commercial buildings."
  },
  {
    id: "electroforged-steel-gratings",
    name: "Electro-Forged Industrial Steel Gratings",
    category: "Walkways & Flooring",
    categorySlug: "walkways-flooring",
    priceFormatted: "₹1,850 / sq.meter",
    rating: "4.9 (31 reviews)",
    image: "product-gratings.jpg",
    badge: "Hot-Dip Galvanized",
    specs: "Bearing Bar: 25x3mm - 50x5mm | Anti-Skid Serrated Edge",
    description: "Heavy-duty steel floor gratings and trench covers for mezzanine walkways, offshore platforms, oil refineries, and drainage channels."
  },
  {
    id: "fire-escape-staircases",
    name: "Prefabricated Industrial Steel Staircases",
    category: "Structural Steel",
    categorySlug: "structural-steel",
    priceFormatted: "₹28,000 / flight",
    rating: "5.0 (27 reviews)",
    image: "gallery-stairs-1.jpg",
    badge: "OSHA Compliant",
    specs: "Chequered Treads | 1.1m Heavy Handrails | Modular Assembly",
    description: "Engineered emergency fire escape staircases, spiral access steps, and catwalk platforms manufactured with certified structural welding."
  },
  {
    id: "cnc-laser-cut-brackets",
    name: "CNC Precision Laser Cut Base Plates & Brackets",
    category: "Custom Fabrication",
    categorySlug: "custom-fabrication",
    priceFormatted: "₹95 / unit",
    rating: "4.9 (64 reviews)",
    image: "gallery-laser-1.jpg",
    badge: "±0.2mm Precision",
    specs: "Plate Thickness: 2mm to 40mm | Laser CNC Cut | Chamfered Holes",
    description: "Custom beam gusset plates, column base anchors, connection brackets, and decorative architectural screens cut to CAD precision."
  }
];

// 4. Project Gallery Database
const galleryData = [
  {
    id: "gallery-1",
    title: "100,000 Sq.Ft Pre-Engineered Logistics Warehouse",
    category: "PEB Sheds & Warehouses",
    categorySlug: "peb-sheds",
    location: "Heavy Industrial Zone, Karnataka",
    year: "2025",
    image: "gallery-peb-1.jpg",
    description: "End-to-end design, fabrication, and on-site erection of a 100,000 sq.ft clear-span PEB logistics warehouse with 20-ton crane rails and Galvalume roof."
  },
  {
    id: "gallery-2",
    title: "High-Pressure Pipe Welding & NDT Testing",
    category: "Welding & Piping",
    categorySlug: "welding",
    location: "Petrochemical Refinery Unit, India",
    year: "2025",
    image: "gallery-welding-1.jpg",
    description: "Certified ASME Section IX TIG & MIG welding on heavy gauge carbon steel pipelines with 100% radiographic and ultrasonic flaw detection."
  },
  {
    id: "gallery-3",
    title: "4-Tier High-Density Pallet Racking Hub",
    category: "Storage & Racks",
    categorySlug: "storage",
    location: "E-Commerce Fulfillment Center",
    year: "2026",
    image: "gallery-racks-1.jpg",
    description: "Fabrication and precision assembly of 2,400 pallet capacity heavy-duty racking bays rated at 3,500 kg per beam level with safety wire mesh decks."
  },
  {
    id: "gallery-4",
    title: "Structural Mezzanine Floor with Office Platform",
    category: "Mezzanine & Structure",
    categorySlug: "mezzanine",
    location: "Manufacturing Plant, Chennai",
    year: "2025",
    image: "gallery-mezzanine-1.jpg",
    description: "Heavy structural steel mezzanine deck adding 12,000 sq.ft of operational assembly floor over existing ground level production line."
  },
  {
    id: "gallery-5",
    title: "CNC Fiber Laser Structural Plate Processing",
    category: "Custom Ironwork",
    categorySlug: "custom",
    location: "SASI Fabrication Yard",
    year: "2026",
    image: "gallery-laser-1.jpg",
    description: "Automated high-speed fiber laser profiling of 25mm structural steel connection plates, gussets, and machine chassis."
  },
  {
    id: "gallery-6",
    title: "Multi-Level Industrial Fire Exit Stair Tower",
    category: "Structural Steel",
    categorySlug: "peb-sheds",
    location: "Commercial Technology Park",
    year: "2025",
    image: "gallery-stairs-1.jpg",
    description: "5-Story external emergency fire exit staircase with anti-skid chequered plate steps, safety balustrades, and weather-proof epoxy finish."
  }
];
