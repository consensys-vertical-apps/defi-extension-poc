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
  getAllTokens,
  getSelectedAccount,
} from '../../../../selectors';
import Spinner from '../../../ui/spinner';
import { Box } from '@material-ui/core';
import {
  AlignItems,
  BorderColor,
  FlexDirection,
} from '../../../../helpers/constants/design-system';
import { Display } from '../../../../helpers/constants/design-system';

// const defiPositions: GroupedPositionsResponse[] = defiResponse;

export const DefiList = () => {
  // const selectedAccount = useSelector(getSelectedAccount);
  // const [defiPositions, setDefiPositions] = useState<
  //   GroupedPositionsResponse[]
  // >([]);
  // const [isLoading, setIsLoading] = useState(false);

  // useEffect(() => {
  //   console.log('selectedAccount', selectedAccount);

  //   if (selectedAccount?.address) {
  //     setIsLoading(true);
  //     const defiSdk = new DefiSdk({
  //       apiUrl: 'https://defi-services.metamask-institutional.io/defi-data',
  //     });

  //     defiSdk
  //       .getPositions({
  //         userAddress: '0x08e82c749fef839ff97e7d17de29b4fdd87b04d7',
  //         // userAddress: selectedAccount.address,
  //       })
  //       .then((positions) => {
  //         setDefiPositions(groupPositionsByProtocolAndChain(positions));
  //         setIsLoading(false);
  //       });
  //   } else {
  //     setDefiPositions([]);
  //     setIsLoading(false);
  //   }
  // }, [selectedAccount?.address]);

  const defiPositions: GroupedPositionsResponse[] = useSelector(
    getAllDefiPositionsForSelectedAddress,
  );

  console.log('defiPositions', defiPositions);

  return (
    <>
      {!defiPositions ? (
        <Box
          paddingTop={6}
          paddingBottom={6}
          marginBottom={4}
          marginTop={4}
          display={Display.Flex}
          alignItems={AlignItems.center}
          flexDirection={FlexDirection.Column}
        >
          <Spinner />
        </Box>
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
