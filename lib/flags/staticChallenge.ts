import crypto from 'crypto';
import '@/lib/flags/validateFlagEnv';

const CAESER_WORDS = [
  'security', 'challenge', 'password', 'encryption', 'firewall',
  'malware', 'phishing', 'vulnerability', 'authentication', 'authorization',
  'backdoor', 'exploit', 'honeypot', 'intrusion', 'keylogger',
  'malicious', 'packet', 'ransomware', 'trojan', 'wireless'
];

const HEX_PHRASES = [
  'catch the flag', 'root access', 'buffer overflow', 'sql injection', 'xss attack',
  'zero day exploit', 'privilege escalation', 'denial of service', 'man in the middle', 'social engineering'
];

const HASH_SAMPLES: Record<string, string[]> = {
  MD5: [
    '5d41402abc4b2a76b9719d911017c592',
    'e10adc3949ba59abbe56e057f20f883e',
    'd8578edf8458ce06fbc5bb76a58c5ca4',
    '25d55ad283aa400af464c76d713c07ad',
    '827ccb0eea8a706c4c34a16891f84e7b'
  ],
  SHA1: [
    '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
    '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
    '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
    '40bd001563085fc35165329ea1ff5c5ecbdbbeef',
    'da8b8c192c4e7d8c4f4f5d4e3b2a1c0d9e8f7a6b'
  ],
  SHA256: [
    '5e884898da280f2c97c5c3e78d62e5e8d7c9a3b2f1e0d9c8b7a6f5e4d3c2b1a0',
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  ]
};

function shiftCaesar(word: string, shift: number): string {
  return word.split('').map(char => {
    if (char >= 'a' && char <= 'z') {
      const code = char.charCodeAt(0) - 97;
      return String.fromCharCode(((code + shift) % 26) + 97);
    }
    return char;
  }).join('');
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashAnswer(answer: string): string {
  return crypto.createHash('sha256').update(answer.toLowerCase().trim()).digest('hex');
}

type Puzzle = { ciphertext: string } | { hex: string } | { hash: string };

export type StaticChallengeResult = {
  puzzle: Puzzle;
  answer: string;
};

export function generateStaticChallenge(
  challenge: { id: string; templateConfig: unknown }
): StaticChallengeResult {
  const config = challenge.templateConfig as { type: string; shift?: number };

  switch (config.type) {
    case 'caesar': {
      const word = pickRandom(CAESER_WORDS);
      const shift = config.shift ?? 3;
      return {
        puzzle: { ciphertext: shiftCaesar(word, shift) },
        answer: word
      };
    }
    case 'hex_decode': {
      const phrase = pickRandom(HEX_PHRASES);
      const hex = Buffer.from(phrase).toString('hex');
      return {
        puzzle: { hex },
        answer: phrase
      };
    }
    case 'hash_identify': {
      const hashTypes = ['MD5', 'SHA1', 'SHA256'] as const;
      const selectedType = pickRandom([...hashTypes]);
      const hash = pickRandom(HASH_SAMPLES[selectedType as keyof typeof HASH_SAMPLES]);
      return {
        puzzle: { hash },
        answer: selectedType as string
      };
    }
    default:
      throw new ChallengeError('Unknown template type');
  }
}

export async function getOrCreateStaticChallenge(
  userId: string,
  challengeId: string,
  templateConfig: unknown
): Promise<{ puzzle: Puzzle }> {
  const { prisma } = await import('@/lib/prisma');

  const existing = await prisma.userFlag.findUnique({
    where: {
      userId_challengeId: { userId, challengeId },
    },
  });

  if (existing) {
    const parsed = JSON.parse(existing.flagHash) as { puzzle: Puzzle };
    return { puzzle: parsed.puzzle };
  }

  const challenge = { id: challengeId, templateConfig };
  const { puzzle, answer } = generateStaticChallenge(challenge);

  const storedData = JSON.stringify({
    puzzle,
    answerHash: hashAnswer(answer)
  });

  await prisma.userFlag.create({
    data: {
      userId,
      challengeId,
      flagHash: storedData,
      generatedAt: new Date(),
    },
  });

  return { puzzle };
}

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeError';
  }
}

export async function verifyStaticChallenge(
  userId: string,
  challengeId: string,
  submitted: string
): Promise<boolean> {
  const { prisma } = await import('@/lib/prisma');

  const userFlag = await prisma.userFlag.findUnique({
    where: {
      userId_challengeId: { userId, challengeId },
    },
  });

  if (!userFlag) {
    return false;
  }

  const stored = JSON.parse(userFlag.flagHash) as { puzzle: Puzzle; answerHash: string };
  const submittedHash = hashAnswer(submitted);

  const storedBuffer = Buffer.from(stored.answerHash, 'hex');
  const submittedBuffer = Buffer.from(submittedHash, 'hex');

  if (storedBuffer.length !== submittedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, submittedBuffer);
}