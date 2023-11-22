import { randomBytes, scryptSync } from 'crypto';
const encryptPassword = (password, salt) => {
    return scryptSync(password, salt, 32).toString('hex');
};
export const hashPassword = (password) => {
    const salt = randomBytes(16).toString('hex');
    return encryptPassword(password, salt) + salt;
};

export const matchPassword = (password, hash) => {
    const salt = hash.slice(64);
    const originalPassHash = hash.slice(0, 64);
    const currentPassHash = encryptPassword(password, salt);
    return originalPassHash === currentPassHash;
};
