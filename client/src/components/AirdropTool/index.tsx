import { useSelector, RootStateOrAny, useDispatch } from "react-redux";
import TokenSelect from "./TokenSelect";
import TokenDetail from "./TokenDetail";
import FileUpload from "./FileUpload";
import AddressList from "./AddressList";
import PopUp from "components/PopUp";
import useDualThemeClass from "hooks/useDualThemeClass";
import {
  AddressAmount,
  AirdropRequestBody,
  Token,
  PopUpType,
  lovelaceToAda,
} from "utils";
import { useState } from "react";
import axios from "axios";
import "./index.scss";
import usePopUp from "hooks/usePopUp";
import { Transaction, TransactionWitnessSet } from "@emurgo/cardano-serialization-lib-asmjs";
import { resolve } from "node:path/win32";
import { createNextState } from "@reduxjs/toolkit";
import { sign } from "node:crypto";
const Buffer = require("buffer/").Buffer;
var multiTx = 'false'
const COMPONENT_CLASS = "airdrop-tool";

export default function AirdropTool() {
  const dispatch = useDispatch();

  const { setPopUpLoading, setPopUpSuccess, setPopUpError } = usePopUp();
  const [txFee, setTxFee] = useState(0);
  const [adaToSpend, setAdaToSpend] = useState(0);
  const [isAbleToAirdrop, setTsAbleToAirdrop] = useState(false);

  const [CLASS, CHILD_CLASS] = useDualThemeClass({
    main: COMPONENT_CLASS,
    el: "child",
  });

  const {
    selectedToken,
    addressArray,
    totalAmountToAirdrop,
    walletAddress,
    addressContainingAda,
    api
  } = useSelector((state: RootStateOrAny) => state.global);

  const sendToken = async () => {
    setPopUpLoading(`Sending ${totalAmountToAirdrop} ${selectedToken.name}`);

    const requestBody = prepareBody(
      walletAddress,
      selectedToken,
      addressArray,
      totalAmountToAirdrop,
      addressContainingAda,
    );
    const url = process.env.REACT_APP_API_TX;
    console.log(multiTx)
    console.log(requestBody)
    try {
      const submitAirdrop = await axios.post(
        `${url}/api/v0/submit`,
        requestBody
      );
      const cborHexInString = submitAirdrop.data.cborHex;
      const txId = submitAirdrop.data.description;
      //if (multiTx == "false") {
      const cleared = await clearSignature(cborHexInString)
      console.log(cleared)
      const signed = await walletSign(cleared[0],cleared[1],txId)
      console.log(signed)
      const submitted = await submit_transaction(signed,url)
      console.log(submitted.status)
      if (multiTx == "false") {
        setPopUpSuccess(
          `${submitted.status}`) 
        }  else {
          setPopUpLoading(`negotiating UTXOs...`);
          //console.log(test.)
          //console.log(test.airdrop_hash)
          await checkAirdropStatus(url,submitted.airdrop_hash,txId)
        }}
       catch (e: any) {}
    };

      const sleep = (ms:number) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
  };
  
     const checkAirdropStatus = async (url:any,airdropHash:any,txId:any) => {
       setPopUpLoading("waiting for initial confirmation");
      
       await axios.get(`${url}/api/v0/airdrop_status/${airdropHash}`).then((response) => {
        
        if(response.data.transactions[0].transaction_status == 'transaction submitted') {
           console.log(response.data.transactions[0].transaction_status)  
           sleep(5000).then(() => {
         checkAirdropStatus(url, airdropHash, txId); 
           }) 
         }else{
           console.log(response.data.transactions[0].transaction_status)
           getAirdrop(url,airdropHash);
         }
        
       })
     };

      const getAirdrop = async (url:any,airdropHash:any) => {
      const transactions = await axios.get(`${url}/api/v0/get_transactions/${airdropHash}`)
      console.log(transactions.data);
       const length = transactions.data.length
      // const cborHex = transactions.data.cborHex
      // const txId = transactions.data.description
      setPopUpLoading(`you will sign ${length} transactions`);
      const loop = await forLoop(transactions,url)
      
      }

      const forLoop = async (transactions:any,url:any) => {
      const length = transactions.data.length 
      for(let i =0; i < length; i++) {
      try {const cborHex = transactions.data[i].cborHex
      let txId = transactions.data[i].description
      console.log(txId)
      let cleared = await clearSignature(cborHex)
      let tx = cleared[0]
      console.log(tx)
      let tWS = cleared[1]
      console.log(tWS)
      let signed = await walletSign(cleared[0],cleared[1],txId)
      console.log(signed)
      let submitted = await submit_transaction(signed,url)
      } catch (e: any) {}
    
     // const submitted = await submit_transaction(signed,url)
      //console.log(submitted)
      }
      
    }






const clearSignature = async (cborHex:any) => {
 
  const txCli = Transaction.from_bytes(Buffer.from(cborHex, "hex"));
    //begin signature
   const txBody = txCli.body();
   const witnessSet = txCli.witness_set();
    //this clears the dummy signature from the transaction
   witnessSet.vkeys()?.free();
    //build new unsigned transaction
   var transactionWitnessSet = TransactionWitnessSet.new();
   var tx = Transaction.new(
       txBody,
       TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes())
  );
   return [tx,transactionWitnessSet]


}

const walletSign = async (tx:any,transactionWitnessSet:any,txId:any) => {
  console.log(tx)
  let txVkeyWitnesses =  await api.signTx(Buffer.from(tx.to_bytes(), "utf8").toString("hex"), true);
  console.log(txVkeyWitnesses)
 txVkeyWitnesses = TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnesses, "hex"));
  console.log(txVkeyWitnesses)
  transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
  const signedTx = Transaction.new(
      tx.body(),
      transactionWitnessSet
  );
  console.log(signedTx)
  const hexSigned = await (Buffer.from(signedTx.to_bytes(), "utf8").toString("hex"));
  console.log(hexSigned)
  const txFormatted = (`{ \n\t\"type\": \"Tx AlonzoEra\",\n\t\"description\": \"${txId}",\n\t\"cborHex\": \"${hexSigned}\"\n}`);
  console.log (txFormatted);
  const txJson = JSON.parse(txFormatted);
  console.log(txJson)
  return txJson;
  
  }











      //setPopUpSuccess()
   
    // const url = process.env.REACT_APP_API_TX;
    // console.log(multiTx)
    // try {
    //   const submitAirdrop = await axios.post(
    //     `${url}/api/v0/submit`,
    //     requestBody
    //   );
    //   const cborHexInString = submitAirdrop.data.cborHex;
    //   const txId = submitAirdrop.data.description;
    //   //const numberTxs = submitAirdrop.data.
    //   //const submission = ''
    //   clearAndSign(cborHexInString,txId,url).then(txJson => 
    //   (submit_transaction(txJson,url))).then(submission => { const test = submission; 
    //     if (multiTx == "false") {
    //     setPopUpSuccess(
    //       `Success. \"${test.status}`) 
    //     }  else {
    //       setPopUpLoading(`negotiating UTXOs...`);
    //       console.log(test)
    //       console.log(test.airdrop_hash)
    //       const airdropStatus = checkAirdropStatus(url,test.airdrop_hash,txId)
    //     }})
      
    //   //setPopUpSuccess()
      
    //} catch (e: any) {}
  // }else{
  //   try { const submitAirdrop = await axios.post(
  //     `${url}/api/v0/submit`,
  //     requestBody
  //   );
  //   const cborHexInString = submitAirdrop.data.cborHex;
  //   const txId = submitAirdrop.data.description;
  //   clearAndSign(cborHexInString,txId,url).then(txJson => {
      
  //   }
  //     )
    
  //   }
   
  
  
  //  catch (e: any) {}   
  // }
    
  



    //signAndSubmit(obj,airdropHash,url,txId).then();
    //const tx = manipulate(obj.tx,txId)
    //clearSignature(cborHex).then(txJson => 
    //(submit_transaction(txJson,url))).then(submission => { const test = submission; 
    //console.log (submission)
  
  

 
  













const clearAndSign = async (cborHex:any, txId:any, url:any) => {
     
    const txCli = Transaction.from_bytes(Buffer.from(cborHex, "hex"));
    //begin signature
   const txBody = txCli.body();
   const witnessSet = txCli.witness_set();
    //this clears the dummy signature from the transaction
   witnessSet.vkeys()?.free();
    //build new unsigned transaction
   const transactionWitnessSet = TransactionWitnessSet.new();
   const tx = Transaction.new(
       txBody,
       TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes())
   );
  
    
   let txVkeyWitnesses =  await api.signTx(Buffer.from(tx.to_bytes(), "utf8").toString("hex"), true);
   txVkeyWitnesses = TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnesses, "hex"));
    transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
    const signedTx = Transaction.new(
        tx.body(),
        transactionWitnessSet
    );
    const hexSigned = (Buffer.from(signedTx.to_bytes(), "utf8").toString("hex"));
    const txFormatted = (`{ \n\t\"type\": \"Tx AlonzoEra\",\n\t\"description\": \"${txId}",\n\t\"cborHex\": \"${hexSigned}\"\n}`);
     //console.log (txFormatted);
    const txJson = JSON.parse(txFormatted);
    return txJson;
    
    }
  
    const submit_transaction = async (txJson:any, url:any) => {
    const txSubmit = await axios.post(`${url}/api/v0/submit_transaction`, txJson);
    const submission = (txSubmit.data);
    return submission;
    }
    //const txSubmit = await axios.post(`${url}/api/v0/submit_transaction`, txJson);
    //const submission = (txSubmit.data);
  
   //return tx
   //return transactionWitnessSet
   //return submission;
  //}
  // const manipulate = async (cborHex:any, txId:any, url:any) => {
  //   const txCli = Transaction.from_bytes(Buffer.from(cborHex, "hex"));
  //   //begin signature
  //  const txBody = txCli.body();
  //  const witnessSet = txCli.witness_set();
  //   //this clears the dummy signature from the transaction
  //  witnessSet.vkeys()?.free();
  //   //build new unsigned transaction
  //  const transactionWitnessSet = TransactionWitnessSet.new();
  //  const tx = Transaction.new(
  //      txBody,
  //      TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes())
  //  );
  //  let txVkeyWitnesses =  await api.signTx(Buffer.from(tx.to_bytes(), "utf8").toString("hex"), true);
  //  txVkeyWitnesses = TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnesses, "hex"));
  //   transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
  //   const signedTx = Transaction.new(
  //       tx.body(),
  //       transactionWitnessSet
  //   );
  //   const hexSigned = (Buffer.from(signedTx.to_bytes(), "utf8").toString("hex"));
  //   const txFormatted = (`{ \n\t\"type\": \"Tx AlonzoEra\",\n\t\"description\": \"${txId}",\n\t\"cborHex\": \"${hexSigned}\"\n}`);
  //    //console.log (txFormatted);
  //   const txJson = JSON.parse(txFormatted);
  //   console.log (txJson);
  //   const txSubmit = await axios.post(`${url}/api/v0/submit_transaction`, txJson);
  //   const submission = (txSubmit.data);
  
  //  //return tx
  //  //return transactionWitnessSet
  //  return submission;
  // }
  
  const validateAirdropRequest = async () => {
    setPopUpLoading("Validating request");

    const requestBody = prepareBody(
      walletAddress,
      selectedToken,
      addressArray,
      totalAmountToAirdrop,
      addressContainingAda
    );
    
    const url = process.env.REACT_APP_API_TX;

    try {
      const txData = await axios.post(`${url}/api/v0/validate`, requestBody);
      const adaToSpendForTxInAda = lovelaceToAda(
        txData.data.spend_amounts.lovelace
      );
      const txFeeInAda = lovelaceToAda(txData.data.tx_fee);
      setTxFee(txFeeInAda);
      setAdaToSpend(adaToSpendForTxInAda);
      setTsAbleToAirdrop(true);
      console.log (txData.data.transactions_count);
      if (txData.data.transactions_count > 1) {
        multiTx = 'true'
        console.log(multiTx)
      }else{
        multiTx = 'false'
      }
      
      setPopUpSuccess(
        `Airdrop is validated. You can proceed with the airdrop.`
      );
    } catch (e: any) {
      switch (e.response?.status) {
        case 406: {
          setPopUpError("Balance in wallet is not enough");
          return;
        }
      }
    }
  };

  return (
    <div className={CLASS}>
      <div className={`${COMPONENT_CLASS}__row ${CHILD_CLASS}`}>
        <h2>Airdrop Parameters</h2>
      </div>
      <div
        className={`${COMPONENT_CLASS}__token_input ${COMPONENT_CLASS}__row ${CHILD_CLASS}`}
      >
        <TokenSelect />
        <FileUpload></FileUpload>
      </div>
      <div className={`${COMPONENT_CLASS}__row ${CHILD_CLASS}`}>
        <AddressList></AddressList>
      </div>
      <div className={`${COMPONENT_CLASS}__row ${CHILD_CLASS}`}>
        <TokenDetail
          adaToSpend={adaToSpend}
          fee={txFee}
          sendToken={sendToken}
          validateAirdropRequest={validateAirdropRequest}
          isAbleToAirdrop={isAbleToAirdrop}
        ></TokenDetail>
      </div>
    </div>
  );
}

function prepareBody(
  walletAddress: string,
  selectedToken: Token,
  addressArray: AddressAmount[],
  totalAmountToAirdrop: number,
  addressContainingAda: AddressAmount[]
) {
  const sourceAddresses = [];
  let estimatedAdaNeeded = (2 + addressArray.length * 2) * Math.pow(10, 6);
  let totalAmountToAirdropInCompleteDecimal = totalAmountToAirdrop;

  for (let addressAmountObject of selectedToken.addressContainingToken) {
    if (totalAmountToAirdropInCompleteDecimal < 0 && estimatedAdaNeeded < 0)
      break;
    totalAmountToAirdropInCompleteDecimal -= addressAmountObject.amount;
    if (addressAmountObject.adaAmount) {
      estimatedAdaNeeded -= addressAmountObject.adaAmount;
    }
    sourceAddresses.push(addressAmountObject.address);
  }

  for (let addressAmountObject of addressContainingAda) {
    if (estimatedAdaNeeded < 0) break;
    if (!sourceAddresses.includes(addressAmountObject.address)) {
      estimatedAdaNeeded -= addressAmountObject.amount;
    }
  }

  const body: AirdropRequestBody = {
    source_addresses: sourceAddresses,
    change_address: walletAddress,
    token_name: `${selectedToken.policyId}.${selectedToken.nameHex}`,
    addresses: addressArray.map((addr: AddressAmount) => ({
      [addr.address]: addr.amount * Math.pow(10, selectedToken.decimals),
    })),
  };
  return body;
}
