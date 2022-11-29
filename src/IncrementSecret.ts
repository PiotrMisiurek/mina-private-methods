import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Poseidon,
  Permissions,
} from 'snarkyjs';

export class IncrementSecret extends SmartContract {
  @state(Field) secret = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method initSecret(salt: Field, firstSecret: Field) {
    this.secret.set(Poseidon.hash([salt, firstSecret]));
  }

  @method incrementSecret(salt: Field, secret: Field) {
    const currentSecret = this.secret.get();
    this.secret.assertEquals(currentSecret);

    Poseidon.hash([salt, secret]).assertEquals(currentSecret);
    this.secret.set(Poseidon.hash([salt, secret.add(1)]));
  }
}
