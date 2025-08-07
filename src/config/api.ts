/**
 * src/config/api.ts
 *
 * --- UPDATED to add the new deleteSubUser endpoint ---
 */
export const API_ENDPOINTS = {
  // --- Premise and User ---
  getUserPremises: 'https://desrxdro92.execute-api.eu-west-2.amazonaws.com/default/GetUserPremisesAPI',
  addSubUser: 'https://wk7n8ephph.execute-api.eu-west-2.amazonaws.com/default/AddSubUserAPI',
  getUserDetails: 'https://vessn5kc20.execute-api.eu-west-2.amazonaws.com/default/GetUserDetailsAPI',
  deleteSubUser: 'https://pobkuk9ed4.execute-api.eu-west-2.amazonaws.com/default/DeleteSubUserAPI', // <-- REPLACE

  // --- Dashboard and Boost ---
  getDashboardData: 'https://kbrcagx0xi.execute-api.eu-west-2.amazonaws.com/default/FrontPageAPIv2',
  boost: 'https://3gtpvcw888.execute-api.eu-west-2.amazonaws.com/default/BoostAppAPIv2',

  // --- Temperature Profiles ---
  getTempProfiles: 'https://wt999xvbu1.execute-api.eu-west-2.amazonaws.com/default/TempProfileDisplayAPIv2',
  updateTempProfile: 'https://rcm4tg6vng.execute-api.eu-west-2.amazonaws.com/default/TempProfileUpdateAPIv2',
  updateTempProfilePriority: 'https://anp440nimj.execute-api.eu-west-2.amazonaws.com/default/TempProfilePriorityUpdateAPIv2',
  deleteTempProfile: 'https://fa2tbi6j76.execute-api.eu-west-2.amazonaws.com/default/TempProfileDeleteAPIv2',

  // --- Water Demand Profiles ---
  getWaterProfiles: 'https://ulpk5mwr4f.execute-api.eu-west-2.amazonaws.com/default/WaterProfileReadAPI',
  updateWaterProfile: 'https://d6riw5ltmk.execute-api.eu-west-2.amazonaws.com/default/WaterProfileUpdateAPI',

  // --- Manual Switches ---
  manualSwitches: 'https://hm7zj3k1s7.execute-api.eu-west-2.amazonaws.com/default/ManualSwitchAPI',
};
