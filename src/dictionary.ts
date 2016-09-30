export function makeDictionary(text: string) {
  const textLines = text.split('\n');
  const wordGroups = textLines.reduce((acc, text, i) => {
    return transformation[i % 5](acc, text.trim());
  }, []);
  return wordGroups;
}

const transformation = {
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
    // auxiliaryVerb = {
    //   'h': AuxiliaryVerb.Haben,
    //   's': AuxiliaryVerb.Sein,
    //   'h, s': AuxiliaryVerb.HabenSein
    // }[auxiliaryVerb];
    // return [Object.assign(group, {auxiliaryVerb}), ...rest];
  },
  4: ([group, ...rest], meaning) => {
    return [Object.assign(group, {meaning}), ...rest];
  }
}
function _transformation([group, ...rest], text, i)  {
  switch(i) {
    case 0: 
      return [{infinitiv: text}, group, ...rest];
    case 1:
      return [Object.assign(group, {praterium: text}), ...rest];
    case 2:
      return [Object.assign(group, {partizip2: text}), ...rest];
    case 3:
      let haben = false,
          sein = false;
      if (text === 'h') {
        haben = true;
      } else if (text === 's') {
        sein = true;
      } else {
        haben = true;
        sein = true;
      }
      return [Object.assign(group, {haben, sein}), ...rest];
      // const auxiliaryVerb = {
      //   'h': AuxiliaryVerb.Haben,
      //   's': AuxiliaryVerb.Sein,
      //   'h, s': AuxiliaryVerb.HabenSein
      // }[text];
      // return [Object.assign(group, {auxiliaryVerb}), ...rest];
    case 4:
      return [Object.assign(group, {meaning: text}), ...rest];
  }
}

enum AuxiliaryVerb {
  Haben,
  Sein,
  HabenSein
}