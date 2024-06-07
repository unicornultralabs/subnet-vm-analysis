/* eslint-disable prettier/prettier */
interface SVMConfirmedTransaction {
    tx_hash: string;
    code_hash: string;
    status: boolean; // tx success hay k, trường hợp fail thì retry
    ret_value?: SVMPrimitives,
    errs?: string
}

// Define the types for the enum variants
interface U24 {
    U24: number;
}

interface Tup {
    type: "Tup";
    value: SVMPrimitives[];
}

/** 
 * Use a union type to represent the enum
 * ```
    // Example usage
    const example1: SVMPrimitives = {
        type: "U24",
        value: 123456
    };

    const example2: SVMPrimitives = {
        type: "Tup",
        value: [{ type: "U24", value: 123 }, { type: "U24", value: 456 }]
    };
 * ```
 * */
type SVMPrimitives = U24 | Tup;

interface ConfirmTx {
    hash: string;
    status: boolean; // tx success hay k, trường hợp fail thì retry
    from_value?: number; //nullable, giá trị của from sau khi success
    to_value?: number; // nullable, giá trị của to sau khi success
}

interface DuanguaTx {
    hash: string;
    status: boolean; // tx success hay k, trường hợp fail thì retry
    ret_value: any;
}