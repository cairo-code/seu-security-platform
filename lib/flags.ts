import { verifyFlag, generateFlag, computeFlagHash, getOrCreateFlag } from './flags/index';
import { getOrCreateStaticChallenge, verifyStaticChallenge, ChallengeError } from './flags/staticChallenge';

export { generateFlag, computeFlagHash, verifyFlag, getOrCreateFlag };
export { getOrCreateStaticChallenge, verifyStaticChallenge, ChallengeError };