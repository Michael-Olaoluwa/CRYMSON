function generateCrymsonId() {
  const yearSuffix = String(new Date().getFullYear()).slice(-2);
  const randomFourDigits = Math.floor(Math.random() * 9000) + 1000;
  return `${yearSuffix}${randomFourDigits}S`;
}

function generateAdminCrymsonId() {
  const yearSuffix = String(new Date().getFullYear()).slice(-2);
  const randomFourDigits = Math.floor(Math.random() * 9000) + 1000;
  return `${yearSuffix}${randomFourDigits}A`;
}

function generateUniqueCrymsonId(users) {
  const existingIds = new Set(users.map((user) => String(user.crymsonId || '').toUpperCase()));
  let candidate = generateCrymsonId();

  while (existingIds.has(candidate.toUpperCase())) {
    candidate = generateCrymsonId();
  }

  return candidate;
}

function isAdminId(crymsonId) {
  return String(crymsonId || '').toUpperCase().endsWith('A');
}

module.exports = {
  generateUniqueCrymsonId,
  generateAdminCrymsonId,
  isAdminId
};
