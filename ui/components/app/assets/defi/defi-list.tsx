import React from 'react';
import { useSelector } from 'react-redux';
import { getImageForChainId } from '../../../../selectors/multichain';
import { defiResponse } from './defi-response';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  BadgeWrapper,
  Box,
} from '../../../component-library';
import {
  Display,
  FlexDirection,
  BlockSize,
} from '../../../../helpers/constants/design-system';
import { Hex } from '@metamask/utils';
import { getNetworkConfigurationsByChainId } from '../../../../../shared/modules/selectors/networks';
import { getTestNetworkBackgroundColor } from '../../../../selectors';

export type TokenWithBalance = {
  address: string;
  symbol: string;
  string?: string;
  image: string;
  secondary?: string;
  tokenFiatAmount?: string;
  isNative?: boolean;
};

const DefiList = () => {
  const defiPositions: any[] = defiResponse;

  return (
    <>
      {defiPositions.map((defiProtocolPositions) => (
        <DefiProtocolListItem
          key={`${defiProtocolPositions.chainId}-${defiProtocolPositions.protocolId}`}
          chain={defiProtocolPositions.chain}
          protocolName={defiProtocolPositions.name}
          iconUrl={defiProtocolPositions.iconUrl}
          totalBalance={defiProtocolPositions.totalBalance}
          tokens={defiProtocolPositions.tokens}
        />
      ))}
    </>
  );
};

const DefiProtocolListItem = ({
  key,
  chain,
  protocolName,
  iconUrl,
  totalBalance,
  tokens,
}: {
  key: string;
  chain: Hex;
  protocolName: string;
  iconUrl: string;
  totalBalance: number;
  tokens: any[];
}) => {
  const allNetworks = useSelector(getNetworkConfigurationsByChainId);
  const tokenChainImage = getImageForChainId(chain);

  return (
    <Box
      display={Display.Flex}
      flexDirection={FlexDirection.Row}
      width={BlockSize.Full}
      height={BlockSize.Full}
      gap={4}
      title={key}
    >
      <BadgeWrapper
        badge={
          <AvatarNetwork
            size={AvatarNetworkSize.Xs}
            name={allNetworks?.[chain]?.name}
            src={tokenChainImage || undefined}
            className="multichain-token-list-item__badge__avatar-network"
          />
        }
        marginRight={4}
        className="multichain-token-list-item__badge"
      >
        <AvatarToken name={protocolName} src={iconUrl} />
      </BadgeWrapper>
      <Box>{protocolName}</Box>
      <Box>
        $
        {totalBalance.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })}
      </Box>
    </Box>
  );
};

export default DefiList;
