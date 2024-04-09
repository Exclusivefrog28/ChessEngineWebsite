export function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

export function displayScore(score) {
    if (score < 2147483382) return score;
    let distance = - (score - 2147483647);
    distance = Math.ceil(distance / 2);
    return `mate in ${distance}`;
}