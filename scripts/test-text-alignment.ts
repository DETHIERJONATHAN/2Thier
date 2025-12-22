import { calculateVerticalCenterOffset } from '../src/services/textAlignmentUtils';

type TestCase = {
  name: string;
  actualHeight: number;
  textHeight: number;
  expectedOffset: number;
};

const testCases: TestCase[] = [
  {
    name: 'Titre principal',
    actualHeight: 50,
    textHeight: 32,
    expectedOffset: 9
  },
  {
    name: 'Sous-titre trop long',
    actualHeight: 30,
    textHeight: 35,
    expectedOffset: 0
  },
  {
    name: 'Bloc texte avec marge',
    actualHeight: 100,
    textHeight: 60,
    expectedOffset: 20
  },
  {
    name: 'Hauteur nulle',
    actualHeight: 0,
    textHeight: 0,
    expectedOffset: 0
  }
];

let failures = 0;
console.log('Test rapide de centrage vertical des ecrits');
for (const testCase of testCases) {
  const offset = calculateVerticalCenterOffset(testCase.actualHeight, testCase.textHeight);
  const pass = Math.abs(offset - testCase.expectedOffset) < 0.001;
  console.log(`- ${testCase.name}: actual=${testCase.actualHeight}, text=${testCase.textHeight}, offset=${offset.toFixed(2)} (${pass ? 'OK' : 'KO'})`);
  if (!pass) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`${failures} scenario(s) ont echoue. Merci de verifier la logique.`);
  process.exitCode = 1;
} else {
  console.log('Tous les scenarios respectent la hauteur disponible, le centrage est stable.');
}
