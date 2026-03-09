export const filterEmptyKeys = (obj) => {
  let filteredObj = {};

  for (let key in obj) {
    if (obj[key] !== "" && obj[key] !== null && obj[key] !== undefined) {
      filteredObj[key] = obj[key]; // Keep only valid values
    }
  }

  return filteredObj;
};
