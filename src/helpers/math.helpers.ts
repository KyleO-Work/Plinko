
/**
 * Generates a random number between two given values (including the two ranges given)
 * @param min The smallest possible number returned
 * @param max The highest possible number returned
 * @returns 
 */
export const getRandomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }