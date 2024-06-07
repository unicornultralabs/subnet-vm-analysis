interface TxResult {
    tx_hash: string;
    code_hash: string;
    status: boolean;
    ret_value?: SVMPrimitives | null; // Use `| null` to represent Option type
    errs?: string | null; // Use `| null` to represent Option type
}