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

  const initialSecret = zkAppInstance.secret.get();
  console.log('Initial secret: ', initialSecret.toString());

  const incrementSecretTxn = await Mina.transaction(deployerAccount, () => {
    zkAppInstance.incrementSecret(salt, secretToInit);
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await incrementSecretTxn.send();

  const incrementedSecret = zkAppInstance.secret.get();
  console.log('Incremented secret: ' + incrementedSecret.toString());
  incrementedSecret.assertEquals(Poseidon.hash([salt, secretToInit.add(1)]));

  console.log('well done, bye bye');
  await shutdown();
})();