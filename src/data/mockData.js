export const LEAGUES = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  DIAMOND: 'Diamond'
};

const generateMockUsers = () => {
  const leagues = [LEAGUES.BRONZE, LEAGUES.SILVER, LEAGUES.GOLD, LEAGUES.DIAMOND];
  const users = [];
  let idCounter = 1;

  const names = [
    "Alex", "Sarah", "Mike", "Emma", "John", "Lisa", "Tom", "Anna", "David", "Kate",
    "James", "Sophie", "Ryan", "Chris", "Amy", "Paul", "Zoe", "Mark", "Nina", "Leo",
    "Mia", "Max", "Eva", "Sam", "Ivy", "Ben", "Joy", "Dan", "Ada", "Kai"
  ];

  leagues.forEach(league => {
    for (let i = 0; i < 24; i++) { // 24 bots + 1 user = 25
      const name = names[Math.floor(Math.random() * names.length)] + (Math.floor(Math.random() * 100));
      // XP ranges based on league to make it realistic
      let baseXp = 0;
      if (league === LEAGUES.BRONZE) baseXp = Math.floor(Math.random() * 500);
      if (league === LEAGUES.SILVER) baseXp = 500 + Math.floor(Math.random() * 500);
      if (league === LEAGUES.GOLD) baseXp = 1000 + Math.floor(Math.random() * 1000);
      if (league === LEAGUES.DIAMOND) baseXp = 2000 + Math.floor(Math.random() * 2000);

      users.push({
        id: `bot_${idCounter++}`,
        name: name,
        xp: baseXp,
        league: league
      });
    }
  });
  return users;
};

export const MOCK_USERS = generateMockUsers();

export const getLeagueThresholds = (league) => {
  if (league === LEAGUES.BRONZE) return { promote: 5, relegate: 0 }; // Top 5 promote
  if (league === LEAGUES.SILVER) return { promote: 5, relegate: 5 }; // Top 5 promote, Bottom 5 relegate
  if (league === LEAGUES.GOLD) return { promote: 8, relegate: 5 }; // Top 8 promote to Diamond, Bottom 5 relegate
  if (league === LEAGUES.DIAMOND) return { promote: 0, relegate: 5 }; // No promotion (max), Bottom 5 relegate
  return { promote: 0, relegate: 0 };
};
