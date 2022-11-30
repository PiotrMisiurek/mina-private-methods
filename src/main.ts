import { IncrementSecret } from './IncrementSecret.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
  Poseidon,
} from 'snarkyjs';

(async function main() {
  await isReady;
  console.log('SnarkyJS ready');

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const deployerAccount = Local.testAccounts[0].privateKey;
  const salt = Field.random();
  const secretToInit = Field(333);

  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  const zkAppInstance = new IncrementSecret(zkAppAddress);
  const deployTxn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    zkAppInstance.initSecret(salt, secretToInit);
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await deployTxn.send();

  const initialSecretHash = zkAppInstance.secret.get();
  console.log('Initial secret: ', initialSecretHash.toString());

  const incrementSecretTxn = await Mina.transaction(deployerAccount, () => {
    zkAppInstance.incrementSecret(salt, secretToInit);
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await incrementSecretTxn.send();

  const incrementedSecret = zkAppInstance.secret.get();
  console.log('Incremented secret: ' + incrementedSecret.toString());
  incrementedSecret.assertEquals(Poseidon.hash([salt, secretToInit.add(1)]));

  try {
    const wrongSecretTxn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.incrementSecret(salt, secretToInit);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await wrongSecretTxn.send();
  } catch (err: any) {
    console.log('Wrong secret: ' + err.message);
  }

  try {
    const wrongSaltTxn = await Mina.transaction(deployerAccount, () => {
      const wrongSalt = salt.add(1);
      zkAppInstance.incrementSecret(wrongSalt, secretToInit.add(1));
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await wrongSaltTxn.send();
  } catch (err: any) {
    console.log('Wrong salt : ' + err.message);
  }

  console.log('well done, bye bye');
  await shutdown();
})();
