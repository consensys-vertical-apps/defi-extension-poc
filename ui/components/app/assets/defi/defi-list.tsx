import React from 'react';
import { defiResponse } from './defi-response-example-to-be-deleted';
import AssetListControlBar from '../asset-list/asset-list-control-bar';
import { GroupedPositionsResponse } from '@metamask-institutional/defi-sdk';

import { DefiProtocolListItem } from './defi-list-item';

const defiPositions: GroupedPositionsResponse[] = defiResponse;

export const DefiList = () => {
  return (
    <>
      <AssetListControlBar showTokensLinks={true} />
      {defiPositions.map((defiProtocolData) => (
        <DefiProtocolListItem
          key={`${defiProtocolData.chainId}-${defiProtocolData.protocolId}`}
          chain={`0x${defiProtocolData.chainId.toString(16)}`}
          protocolName={defiProtocolData.positions[0]!.name}
          iconUrl={defiProtocolData.positions[0]!.iconUrl}
          aggrigatedValues={defiProtocolData.aggregatedValues}
          positions={defiProtocolData}
        />
      ))}
    </>
  );
};
