/**
 * PAGES DATA
 * -----------
 * One entry per page image in /assets/pages (page-01.webp ... page-NN.webp).
 * This file drives the table of contents, the live search index, and the
 * section chips shown in the progress rail.
 *
 * To regenerate this scaffold for a future edition, run:
 *   python3 build/generate_pages.py path/to/NewIssue.pdf
 * then fill in title/section/snippet for any new pages it appends below.
 */
const PHD_BOOK = {
  title: "Springboard",
  edition: "Q2 '26 Edition",
  brand: "PHD Nigeria",
  totalPages: 18,
  pages: [
    { n: 1,  section: "Cover",        title: "Springboard — Q2 '26",              snippet: "Company news, staff news and articles from PHD Nigeria." },
    { n: 2,  section: "Contents",     title: "Table of Contents",                 snippet: "Editor's note, company news, articles, staff spotlight, birthdays, health tips." },
    { n: 3,  section: "Editor's Note",title: "Editor's Note",                     snippet: "Oladimeji Famodimu reflects on a quarter driven by people, culture and ambition." },
    { n: 4,  section: "Company News", title: "Media Agency of the Year — 3rd Year",snippet: "PHD Nigeria wins big at the 2026 Pitcher Awards with 29 medals across five teams." },
    { n: 5,  section: "Company News", title: "VST 2026: Aligning for the Future", snippet: "The Vision, Strategy and Team retreat at Ogere Resort." },
    { n: 6,  section: "Company News", title: "OMGWCA Creative Exchange Program",  snippet: "Kachi Ekwem, Amaka Micheal and Oyinkansola Ologun shine on the regional leaderboard." },
    { n: 7,  section: "Company News", title: "PHD Aerobics: Outpace 2.0",         snippet: "The second edition of PHD OUTPACE and the steps challenge." },
    { n: 8,  section: "Staff News",   title: "Staff Spotlight: Monday Musa",      snippet: "Meet the newest addition to the PHD family — Administrative Assistant, Executive." },
    { n: 9,  section: "Staff News",   title: "Staff Birthdays — April",           snippet: "Emmanuel Olawepo, Chima Amadi, Adebayo Amosun, Chijioke Njoku." },
    { n: 10, section: "Staff News",   title: "Staff Birthdays — May",             snippet: "Uju Ononuju, Nmesoma Njepuome, Tracey Afuwape, Kehinde Adeyemi, Ogechukwu Okoli, Adeyanju Kuju." },
    { n: 11, section: "Staff News",   title: "Staff Birthdays — May (cont'd)",    snippet: "Brendan Aiwuyo, Remilekun Dosumu, Nnamdi Okwudinma." },
    { n: 12, section: "Staff News",   title: "Staff Birthdays — June",            snippet: "Olamide Arowa, Uche Obilom, Tope Sanni Wahab, Dozie Okafor." },
    { n: 13, section: "Articles",     title: "Attention Recession",               snippet: "Kachi Ekwem on why bigger media budgets are buying less attention." },
    { n: 14, section: "Articles",     title: "The Digital Attention Paradox",     snippet: "Oladimeji Olanrewaju on more platforms, more data, less consumer connection." },
    { n: 15, section: "Articles",     title: "The New Luxury",                    snippet: "Kehinde Oziwo on why wellbeing is becoming the ultimate status symbol." },
    { n: 16, section: "Articles",     title: "Beyond Accessibility",              snippet: "Oluwadamilola Afolabi on creating workplaces where everyone can thrive." },
    { n: 17, section: "Health Tips",  title: "Health Tips",                       snippet: "Sleep, movement, hydration, mental wellbeing and preventive checks." },
    { n: 18, section: "Back Cover",   title: "Thank You for Reading",             snippet: "Want to feature in the next edition? springboard@phdnigeria.com" }
  ]
};
