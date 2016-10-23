export function makeThreeFormsDictionary(text: string) {
  const textLines = text.split('\n');
  const wordGroups = textLines.reduce((acc, text, i) => {
    return threeFormsTransformation[i % 5](acc, text.trim());
  }, []);
  return wordGroups;
}

const threeFormsTransformation = {
  0: (acc, infinitiv) => {
    return [{infinitiv}, ...acc];
  },
  1: ([group, ...rest], praterium) => {
    return [Object.assign(group, {praterium}), ...rest];
  },
  2: ([group, ...rest], partizip2) => {
    return [Object.assign(group, {partizip2}), ...rest];
  },
  3: ([group, ...rest], auxiliaryVerb: string) => {
    let haben = false,
        sein = false;
    if (auxiliaryVerb === 'h') {
      haben = true;
    } else if (auxiliaryVerb === 's') {
      sein = true;
    } else {
      haben = true;
      sein = true;
    }
    return [Object.assign(group, {haben, sein}), ...rest];
  },
  4: ([group, ...rest], meaning) => {
    return [Object.assign(group, {meaning}), ...rest];
  },
}

export function makePairsDictionary(text: string) {
  const textLines = text.split('\n');
  const wordGroups = textLines.reduce((acc, text, i) => {
    return pairsTransformation[i % 2](acc, text.trim());
  }, []);
  return wordGroups;
}

const pairsTransformation = {
  0: (acc, meaning) => {
    return [{meaning}, ...acc];
  },
  1: ([group, ...rest], german) => {
    return [Object.assign(group, {german}), ...rest];
  },
}