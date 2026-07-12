import React from 'react';
import HanaTaskCreationPage from '../pages/HanaTaskCreationPage';

const AskerPostErrand: React.FC = () => {
  // Companies use the EXACT SAME Hana task creation flow as individuals
  // Just with userRole="asker" to indicate company is acting as task poster
  return <HanaTaskCreationPage userRole="asker" />;
};

export default AskerPostErrand;
