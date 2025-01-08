import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { DefiSdk, groupPositionsByProtocolAndChain, GroupedPositionsResponse } from '@metamask-institutional/defi-sdk';
import type {
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type { AddApprovalRequest } from '@metamask/approval-controller';
import type {
  RestrictedControllerMessenger,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import { BaseController } from '@metamask/base-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type {
  NetworkClientId,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerNetworkDidChangeEvent,
  NetworkControllerStateChangeEvent,
  NetworkState,
  Provider,
} from '@metamask/network-controller';
import type { Hex } from '@metamask/utils';
import { Mutex } from 'async-mutex';
import type { Patch } from 'immer';

type GroupedPositionsResponseFixed = GroupedPositionsResponse & {
  aggregatedValues: {
    [prop: string]: number;
  };
};

/**
 * @type DefiListControllerState
 *
 * Defi list controller state
 * @property groupedPositions - List of positions associated with the active network and address pair
 * @property allGroupedPositions - Object containing positions by network and account
 */
export type DefiListControllerState = {
  positions: GroupedPositionsResponseFixed[];
};

const metadata = {
  positions: {
    persist: true,
    anonymous: false,
  },
};

const controllerName = 'DefiListController';

export type DefiListControllerActions =
  | DefiListControllerGetStateAction;
  // | TokensControllerAddDetectedTokensAction;

export type DefiListControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  DefiListControllerState
>;

// export type TokensControllerAddDetectedTokensAction = {
//   type: `${typeof controllerName}:addDetectedTokens`;
//   handler: TokensController['addDetectedTokens'];
// };

/**
 * The external actions available to the {@link DefiListController}.
 */
export type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | AccountsControllerGetAccountAction
  | AccountsControllerGetSelectedAccountAction;

export type DefiListControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  DefiListControllerState
>;

export type DefiListControllerEvents = DefiListControllerStateChangeEvent;

export type AllowedEvents =
  | NetworkControllerStateChangeEvent
  | NetworkControllerNetworkDidChangeEvent
  | AccountsControllerSelectedEvmAccountChangeEvent;

/**
 * The messenger of the {@link DefiListController}.
 */
export type DefiListControllerMessenger = RestrictedControllerMessenger<
  typeof controllerName,
  DefiListControllerActions | AllowedActions,
  DefiListControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

export const getDefaultDefiListState = (): DefiListControllerState => {
  return {
    positions: [],
  };
};

/**
 * Controller that stores assets and exposes convenience methods
 */
export class DefiListController extends BaseController<
  typeof controllerName,
  DefiListControllerState,
  DefiListControllerMessenger
> {
  readonly #mutex = new Mutex();

  #chainId: Hex;

  #selectedAccountId: string;

  #provider: Provider;

  #abortController: AbortController;

  /**
   * Tokens controller options
   * @param options - Constructor options.
   * @param options.chainId - The chain ID of the current network.
   * @param options.provider - Network provider.
   * @param options.state - Initial state to set on this controller.
   * @param options.messenger - The controller messenger.
   */
  constructor({
    chainId: initialChainId,
    provider,
    state,
    messenger,
  }: {
    chainId: Hex;
    provider: Provider;
    state?: Partial<DefiListControllerState>;
    messenger: DefiListControllerMessenger;
  }) {
    super({
      name: controllerName,
      metadata,
      messenger,
      state: {
        ...getDefaultDefiListState(),
        ...state,
      },
    });

    this.#chainId = initialChainId;

    this.#provider = provider;

    this.#selectedAccountId = this.#getSelectedAccount().id;

    this.#abortController = new AbortController();

    // this.messagingSystem.registerActionHandler(
    //   `${controllerName}:addDetectedTokens` as const,
    //   this.addDetectedTokens.bind(this),
    // );

    this.messagingSystem.subscribe(
      'AccountsController:selectedEvmAccountChange',
      this.#onSelectedAccountChange.bind(this),
    );

    this.messagingSystem.subscribe(
      'NetworkController:networkDidChange',
      this.#onNetworkDidChange.bind(this),
    );

    this.messagingSystem.subscribe(
      'NetworkController:stateChange',
      this.#onNetworkStateChange.bind(this),
    );

    // this.messagingSystem.subscribe(
    //   'TokenListController:stateChange',
    //   ({ tokenList }) => {
    //     const { tokens } = this.state;
    //     if (tokens.length && !tokens[0].name) {
    //       this.#updateTokensAttribute(tokenList, 'name');
    //     }
    //   },
    // );
  }

  /**
   * Handles the event when the network changes.
   *
   * @param networkState - The changed network state.
   * @param networkState.selectedNetworkClientId - The ID of the currently
   * selected network client.
   */
   async #onNetworkDidChange({ selectedNetworkClientId }: NetworkState) {
    const selectedNetworkClient = this.messagingSystem.call(
      'NetworkController:getNetworkClientById',
      selectedNetworkClientId,
    );
    console.log('onNetworkDidChange', selectedNetworkClient);
    const { positions } = this.state;
    const { chainId } = selectedNetworkClient.configuration;
    this.#abortController.abort();
    this.#abortController = new AbortController();
    this.#chainId = chainId;

    const positions = await this.#getGroupedPositions()

    this.update((state) => {
      state.groupedPositions = allGroupedPositions[chainId]?.[selectedAddress] || [];
    });
  }

  /**
   * Handles the event when the network state changes.
   * @param _ - The network state.
   * @param patches - An array of patch operations performed on the network state.
   */
  #onNetworkStateChange(_: NetworkState, patches: Patch[]) {
    console.log('onNetworkStateChange');
    // Remove state for deleted networks
    for (const patch of patches) {
      if (
        patch.op === 'remove' &&
        patch.path[0] === 'networkConfigurationsByChainId'
      ) {
        const removedChainId = patch.path[1] as Hex;

        this.update((state) => {
          delete state.allGroupedPositions[removedChainId];
        });
      }
    }
  }

  /**
   * Handles the selected account change in the accounts controller.
   * @param selectedAccount - The new selected account
   */
  async #onSelectedAccountChange(selectedAccount: InternalAccount) {
    console.log('onSelectedAccountChange', selectedAccount);
    const { allGroupedPositions } = this.state;
    this.#selectedAccountId = selectedAccount.id;

    const accountPositions = await this.#getGroupedPositions();

    console.log('xxx', accountPositions);

    this.update((state) => {
      // state.groupedPositions = allGroupedPositions[this.#chainId]?.[selectedAccount.address] ?? [];
      state.groupedPositions = accountPositions;
    });
  }

  #getProvider(networkClientId?: NetworkClientId): Web3Provider {
    return new Web3Provider(
      networkClientId
        ? this.messagingSystem.call(
            'NetworkController:getNetworkClientById',
            networkClientId,
          ).provider
        : this.#provider,
    );
  }


  #getAddressOrSelectedAddress(address: string | undefined): string {
    if (address) {
      return address;
    }

    return this.#getSelectedAddress();
  }

  #isInteractingWithWallet(address: string | undefined) {
    const selectedAddress = this.#getSelectedAddress();

    return selectedAddress === address;
  }

  /**
   * Removes all tokens from the ignored list.
   */
  // clearIgnoredTokens() {
  //   this.update((state) => {
  //     state.ignoredTokens = [];
  //     state.allIgnoredTokens = {};
  //   });
  // }

  #getSelectedAccount() {
    return this.messagingSystem.call('AccountsController:getSelectedAccount');
  }

  #getSelectedAddress() {
    // If the address is not defined (or empty), we fallback to the currently selected account's address
    const account = this.messagingSystem.call(
      'AccountsController:getAccount',
      this.#selectedAccountId,
    );
    return account?.address || '';
  }

  /**
   * Reset the controller state to the default state.
   */
  resetState() {
    this.update(() => {
      return getDefaultDefiListState();
    });
  }

  async #getGroupedPositions() {
    const selectedAccount = this.#getSelectedAddress();

    const defiSdk = new DefiSdk({
      apiUrl: 'https://defi-services.metamask-institutional.io/defi-data',
    });

    const positions = await defiSdk.getPositions({
      userAddress: '0x08e82c749fef839ff97e7d17de29b4fdd87b04d7',
      // userAddress: selectedAccount,
    })

    const groupedPositions = groupPositionsByProtocolAndChain(positions);

    return groupedPositions as GroupedPositionsResponseFixed[];
  }
}

export default DefiListController;
