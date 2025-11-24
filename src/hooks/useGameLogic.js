import { useState, useEffect } from 'react';
import { useTask } from '../context/TaskContext';
import { LEAGUES, MOCK_USERS, getLeagueThresholds } from '../data/mockData';

export const useGameLogic = () => {
  const { user, tasks } = useTask();
  const [leagueRank, setLeagueRank] = useState(0);
  const [promotionStatus, setPromotionStatus] = useState('stable'); // stable, promoting, relegating

  // Calculate rank based on XP compared to mock users in the same league
  useEffect(() => {
    // Logic moved to TaskContext

    const leagueUsers = MOCK_USERS.filter(u => u.league === user.league);
    const allUsersInLeague = [...leagueUsers, { ...user, name: 'You' }];
    
    // Sort by XP descending
    const sorted = allUsersInLeague.sort((a, b) => b.xp - a.xp);
    const myRank = sorted.findIndex(u => u.name === 'You') + 1;
    
    setLeagueRank(myRank);
    
    const thresholds = getLeagueThresholds(user.league);
    const totalInLeague = sorted.length;
    
    if (myRank <= thresholds.promote) {
      setPromotionStatus('promoting');
    } else if (myRank > totalInLeague - thresholds.relegate) {
      setPromotionStatus('relegating');
    } else {
      setPromotionStatus('stable');
    }
    
  }, [user.xp, user.league]);

  return {
    leagueRank,
    promotionStatus,
    currentLeague: user.league
  };
};
