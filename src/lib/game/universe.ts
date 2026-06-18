/**
 * Curated universe of liquid, long-history US names. We anonymize the chart, so
 * the point isn't to recognize the ticker — it's to read the *setup*. Mixing
 * sectors and a range of behaviors keeps the daily problem varied.
 *
 * Honest caveat: these are companies that survived to today, so the set carries
 * survivorship bias and the unconditional 3-month return skews upward. That would
 * make "always pick up" a winning strategy — so we do NOT sample dates uniformly.
 * `daily.ts` balances the chosen decision date across A/B/C outcomes, which makes
 * the answer distribution ~uniform regardless of the universe's upward drift.
 */
export const UNIVERSE: { ticker: string; company: string }[] = [
  { ticker: "AAPL", company: "Apple" },
  { ticker: "MSFT", company: "Microsoft" },
  { ticker: "AMZN", company: "Amazon" },
  { ticker: "GOOGL", company: "Alphabet" },
  { ticker: "META", company: "Meta Platforms" },
  { ticker: "NVDA", company: "NVIDIA" },
  { ticker: "TSLA", company: "Tesla" },
  { ticker: "JPM", company: "JPMorgan Chase" },
  { ticker: "V", company: "Visa" },
  { ticker: "JNJ", company: "Johnson & Johnson" },
  { ticker: "WMT", company: "Walmart" },
  { ticker: "PG", company: "Procter & Gamble" },
  { ticker: "DIS", company: "Walt Disney" },
  { ticker: "NFLX", company: "Netflix" },
  { ticker: "KO", company: "Coca-Cola" },
  { ticker: "PEP", company: "PepsiCo" },
  { ticker: "INTC", company: "Intel" },
  { ticker: "AMD", company: "Advanced Micro Devices" },
  { ticker: "BA", company: "Boeing" },
  { ticker: "NKE", company: "Nike" },
  { ticker: "SBUX", company: "Starbucks" },
  { ticker: "MCD", company: "McDonald's" },
  { ticker: "CRM", company: "Salesforce" },
  { ticker: "ORCL", company: "Oracle" },
  { ticker: "ADBE", company: "Adobe" },
  { ticker: "PYPL", company: "PayPal" },
  { ticker: "QCOM", company: "Qualcomm" },
  { ticker: "T", company: "AT&T" },
  { ticker: "XOM", company: "ExxonMobil" },
  { ticker: "CVX", company: "Chevron" },
  { ticker: "BAC", company: "Bank of America" },
  { ticker: "GE", company: "General Electric" },
  { ticker: "F", company: "Ford" },
  { ticker: "UBER", company: "Uber" },
  { ticker: "SHOP", company: "Shopify" },
  { ticker: "SQ", company: "Block" },
  { ticker: "COST", company: "Costco" },
  { ticker: "HD", company: "Home Depot" },
  { ticker: "CAT", company: "Caterpillar" },
  { ticker: "GS", company: "Goldman Sachs" },
  // Wider sector + trajectory mix (banks, pharma, health, industrials, retail, autos, semis)
  { ticker: "IBM", company: "IBM" },
  { ticker: "CSCO", company: "Cisco" },
  { ticker: "PFE", company: "Pfizer" },
  { ticker: "MRK", company: "Merck" },
  { ticker: "ABBV", company: "AbbVie" },
  { ticker: "UNH", company: "UnitedHealth" },
  { ticker: "C", company: "Citigroup" },
  { ticker: "WFC", company: "Wells Fargo" },
  { ticker: "MS", company: "Morgan Stanley" },
  { ticker: "MMM", company: "3M" },
  { ticker: "UPS", company: "United Parcel Service" },
  { ticker: "LOW", company: "Lowe's" },
  { ticker: "TGT", company: "Target" },
  { ticker: "GM", company: "General Motors" },
  { ticker: "MU", company: "Micron Technology" },
  { ticker: "TXN", company: "Texas Instruments" },
];
