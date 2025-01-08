import React, { useEffect, useState } from 'react';
import { defiResponse } from './defi-response-example-to-be-deleted';
import AssetListControlBar from '../asset-list/asset-list-control-bar';
import {
  DefiSdk,
  groupPositionsByProtocolAndChain,
  type GroupedPositionsResponse,
} from '@metamask-institutional/defi-sdk';

import { DefiProtocolListItem } from './defi-list-item';
import { useSelector } from 'react-redux';
import {
  getAllDefiPositionsForSelectedAddress,
  getSelectedAccount,
} from '../../../../selectors';
import Spinner from '../../../ui/spinner';

const defiPositions: GroupedPositionsResponse[] = defiResponse;

export const DefiList = () => {
  const selectedAccount = useSelector(getSelectedAccount);
  const [defiPositions, setDefiPositions] = useState<
    GroupedPositionsResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('selectedAccount', selectedAccount);

    if (selectedAccount?.address) {
      setIsLoading(true);
      const defiSdk = new DefiSdk({
        apiUrl: 'https://defi-services.metamask-institutional.io/defi-data',
      });

      defiSdk
        .getPositions({
          userAddress: '0x08e82c749fef839ff97e7d17de29b4fdd87b04d7',
          // userAddress: selectedAccount.address,
        })
        .then((positions) => {
          setDefiPositions(groupPositionsByProtocolAndChain(positions));
          setIsLoading(false);
        });
    } else {
      setDefiPositions([]);
      setIsLoading(false);
    }
  }, [selectedAccount?.address]);

  const defiPositions2 = useSelector(getAllDefiPositionsForSelectedAddress);

  console.log('defiPositions2', defiPositions2);

  return (
    <>
      {isLoading ? (
        <Spinner />
      ) : (
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
      )}
    </>
  );
};
