"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Nav from "@/components/Nav";

type Section = "gear" | "process" | "influences";

const TABS: { id: Section; label: string }[] = [
  { id: "gear", label: "Gear" },
  { id: "process", label: "Process" },
  { id: "influences", label: "Influences" },
];

// ─── Gear data ────────────────────────────────────────────────────────────────

const GEAR = {
  digitalBodies: [
    {
      name: "Sony A7R V",
      note: "Primary body. 61MP full frame with great dynamic range. Does most of the heavy lifting.",
    },
    {
      name: "Sony A7 III",
      note: "Secondary body. Used for backup and video work.",
    },
  ],
  lenses: [
    {
      name: "Sony FE 50mm f/1.2 GM",
      note: "The nifty fifty. Goes on the camera more than anything else.",
    },
    {
      name: "Sony FE 70-200mm f/2.8 GM II",
      note: "Workhorse zoom. Sports, events, portraits at a distance.",
    },
    {
      name: "Sony FE 200-600mm f/5.6-6.3 G OSS",
      note: "Long telephoto. Wildlife, sports, anything far away.",
    },
    {
      name: "Sony FE 16-35mm f/2.8 GM",
      note: "Wide end. Architecture, interiors, landscapes.",
    },
    {
      name: "Sigma 24-70mm f/2.8 DG DN Art",
      note: "General purpose zoom. Good value for what it does.",
    },
    {
      name: "7Artisans 50mm f/0.95",
      note: "Manual focus, f/0.95 maximum aperture. Renders completely differently to the Sony glass. Fun to shoot with.",
    },
    {
      name: "Retropia Pocket Dispo",
      note: "Disposable camera aesthetic on a proper body. Not a serious lens but produces interesting results.",
    },
  ],
  filmBodies: [
    {
      name: "Zenza Bronica S2A",
      note: "Medium format 120. Slower and more deliberate than anything digital. 12 frames per roll keeps you honest.",
    },
    {
      name: "Nikkormat FT3",
      note: "35mm SLR. Fully mechanical with no batteries required. Good for street and travel.",
    },
  ],
  filmStocks: [
    {
      name: "Kodak Portra 400",
      note: "Favourite colour stock. Forgiving latitude and beautiful grain.",
    },
    {
      name: "Kodak Tri-X 400",
      note: "Black and white standard. Timeless for a reason.",
    },
    {
      name: "Cinestill 800T",
      note: "Night shooting and tungsten-lit scenes. The halation is part of the appeal.",
    },
  ],
  accessories: [
    {
      name: "Peak Design Travel Tripod",
      note: "Carbon fibre. Light enough to actually bring on a trip.",
    },
  ],
  software: [
    {
      name: "Adobe Lightroom Classic",
      note: "Primary editing and culling.",
    },
    {
      name: "Capture One",
      note: "Tethered shooting and anything needing more fine-grained control.",
    },
  ],
};

// ─── Process data ─────────────────────────────────────────────────────────────

const PROCESS = [
  "When I get somewhere new, I tend to spend a lot of time just walking around before I even take out the camera. Just trying to get a feel for the place, where the light is, what the interesting angles might be. I find that the photos come more easily when I have that mental map in place.",

  "I reach for the 50 mm more than anything when I have the choice, but realisticly the 70-200 ends up on the camera a lot. It depends on what I'm shooting. I don't really have a strict approach, I just use whatever makes sense for the situation.",

  "Exposure-wise, I mix manual and aperture priority depending on the situation. I like having control, but I also don't want to miss shots fiddling with settings.",

  "My editing is pretty minimal, mostly exposure adjustments and colour. I'm not doing a lot of heavy retouching or compositing. I try to keep it looking like something that actually happened.",

  "I'll be honest, I don't have a consistent editing schedule. Sometimes I'll edit the same night, sometimes the photos sit on my drive for way longer than they should. Working on it.",

  "I'm still figuring out my style. Digital and film feel pretty different to me so I'm not sure they add up to one coherent thing yet. I do think it's worth putting photos out even if I'm not completely happy with them, someone else might see something in them that I don't.",

  "On film I'm pretty careful, the Bronica gives me 12 frames per roll so every shot counts. Digital I'll shoot more freely and cull later. I shoot a mix of everything: sports, landscape, street, whatever I happen to be around.",
];

// ─── Influences data ──────────────────────────────────────────────────────────

const INFLUENCES = [
  {
    name: "Phil Penman",
    why: "I'd known of Phil's work before I ever saw him in person. I was in the Leica store just having a conversation with some of the people in there, and had no idea that the guy standing next to me was one of the photographers whose work I'd been admiring for years. Once he left we spoke about workshops at the store, and the lady let me know that the man that was just next to me was Phil Penman... His street work is what keeps me coming back though. 25 years documenting New York, the 9/11 work, the pandemic series that ended up in the Library of Congress. The consistency over that kind of time span is what I find most impressive.",
  },
  {
    name: "Mark de Paola",
    why: "The 60 Seconds series is what got me, every image is a 60 second handheld exposure, so the compared to most other photography, the blur is the whole point. His fine art and fashion work cross over in a way that feels intentional rather than commercial. One thing worth saying is that a lot of his work involves the figure, and it doesn't feel exploitative or shocking the way nudity gets used a lot of the time. It just feels like part of the subject matter. Work in MoMA and the Getty if that means anything to you.",
  },
  {
    name: "Dave Knachel",
    why: "Dave was my mentor at VT Athletics. He gave me access and opportunity I wouldn't have had otherwise, covering football, volleyball, softball, soccer, etc. I learned more in those two years than I could have anywhere else. Sports photography has no margin for error and no second chances. That urgency never really leaves you, even when you're shooting something slow.",
  },
  {
    name: "Sebastião Salgado",
    why: "Genesis did it for me. Both the visual side and the subject matter. You can't really separate the two. The scale of it, the black and white, the years it took. It made me think about photography as something you could commit a serious chunk of your life to.",
  },
  {
    name: "Fan Ho",
    why: "The geometry and the atmosphere are so tied together in his work that it's hard to say which one you're responding to. Mid-century Hong Kong through his lens looks like a completely different world. He found light and shadow in everyday scenes in a way that still holds up completely.",
  },
  {
    name: "Hiroshi Sugimoto / Micheal Kenna",
    why: "I was mixing these two together because they both do these long exposures that turn the world into this kind of ethereal blur. Sugimoto's seascapes are iconic, but I also really like his work with architecture and theatres. Kenna's landscapes are incredible, giving a sense of calm and timelessness. Both of them show how much you can do with a simple concept if you execute it well",
  },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  intro: {
    fontFamily: "var(--font-serif)",
    fontSize: "clamp(1rem, 1.5vw, 1.1rem)",
    fontWeight: 300,
    fontStyle: "italic",
    color: "rgba(212,220,232,0.5)",
    lineHeight: 1.8,
    maxWidth: "580px",
    marginBottom: "3rem",
  } as React.CSSProperties,
  catLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    color: "#C9A96E",
    opacity: 0.8,
    marginBottom: "1rem",
  },
  itemName: {
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "#D4DCE8",
    marginBottom: "0.2rem",
    letterSpacing: "0.02em",
  },
  itemNote: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "rgba(212,220,232,0.4)",
    letterSpacing: "0.03em",
    lineHeight: 1.6,
  },
};

// ─── Gear section ─────────────────────────────────────────────────────────────

function GearSection() {
  const categories = [
    { title: "Digital bodies", items: GEAR.digitalBodies },
    { title: "Lenses", items: GEAR.lenses },
    { title: "Film bodies", items: GEAR.filmBodies },
    { title: "Film stocks", items: GEAR.filmStocks },
    { title: "Accessories", items: GEAR.accessories },
    { title: "Software", items: GEAR.software },
  ];

  return (
    <motion.div
      key="gear"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <p style={S.intro}>
        What I shoot with. The digital kit gets most of the use; the film
        cameras slow things down in the right way.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "2.5rem",
        }}
      >
        {categories.map((cat) => (
          <div key={cat.title}>
            <p style={S.catLabel}>{cat.title}</p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {cat.items.map((item) => (
                <div
                  key={item.name}
                  style={{
                    borderLeft: "0.5px solid rgba(212,220,232,0.1)",
                    paddingLeft: "1rem",
                  }}
                >
                  <p style={S.itemName}>{item.name}</p>
                  <p style={S.itemNote}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Process section ──────────────────────────────────────────────────────────

function ProcessSection() {
  return (
    <motion.div
      key="process"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ maxWidth: "600px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        {PROCESS.map((para, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "rgba(212,220,232,0.55)",
              lineHeight: 1.9,
              letterSpacing: "0.02em",
            }}
          >
            {para}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Influences section ───────────────────────────────────────────────────────

function InfluencesSection() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <motion.div
      key="influences"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <p style={S.intro}>
        People whose work or teaching changed how I see. People I've encountered
        directly, or whose work I keep coming back to.
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {INFLUENCES.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            onClick={() => setActive(active === item.name ? null : item.name)}
            style={{
              padding: "1.5rem 0",
              borderBottom: "0.5px solid rgba(212,220,232,0.07)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(1.05rem, 1.8vw, 1.35rem)",
                  fontWeight: 300,
                  color: active === item.name ? "#C9A96E" : "#D4DCE8",
                  letterSpacing: "0.02em",
                  transition: "color 0.2s",
                }}
              >
                {item.name}
              </h3>
              <motion.span
                animate={{ rotate: active === item.name ? 45 : 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "16px",
                  color: "rgba(212,220,232,0.25)",
                  lineHeight: 1,
                  display: "block",
                  flexShrink: 0,
                  marginLeft: "1rem",
                }}
              >
                +
              </motion.span>
            </div>

            <AnimatePresence>
              {active === item.name && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "rgba(212,220,232,0.5)",
                    lineHeight: 1.8,
                    letterSpacing: "0.02em",
                    maxWidth: "560px",
                    paddingTop: "0.75rem",
                    overflow: "hidden",
                  }}
                >
                  {item.why}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BehindClient() {
  const [activeTab, setActiveTab] = useState<Section>("gear");

  return (
    <div
      style={{ background: "#0E1824", minHeight: "100vh", color: "#D4DCE8" }}
    >
      <Nav visible={true} />

      <div
        style={{
          padding:
            "clamp(6rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem) clamp(3rem, 6vw, 5rem)",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ marginBottom: "3.5rem" }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#B87333",
              opacity: 0.9,
              marginBottom: "0.5rem",
            }}
          >
            Behind the lens
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#D4DCE8",
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            How it's made.
          </h1>
        </motion.div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            marginBottom: "3rem",
            borderBottom: "0.5px solid rgba(212,220,232,0.08)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: "none",
                borderBottom: `1.5px solid ${activeTab === tab.id ? "#C9A96E" : "transparent"}`,
                color:
                  activeTab === tab.id ? "#C9A96E" : "rgba(212,220,232,0.35)",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "-0.5px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "gear" && <GearSection />}
          {activeTab === "process" && <ProcessSection />}
          {activeTab === "influences" && <InfluencesSection />}
        </AnimatePresence>
      </div>
    </div>
  );
}
