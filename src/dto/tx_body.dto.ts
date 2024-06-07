interface TxBody {
  tx_hash: string;
  code_hash: string;
  objs: string[];
  args: SVMPrimitives[];
}

interface SubmitTx {
  SubmitTx: {
    tx_body: TxBody;
  };
}
