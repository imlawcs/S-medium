import {config} from 'dotenv';
config();

export function mustGetEnv(varName: string): string {
    const value = process.env[varName];
    if (!value) {
        throw new Error(`Environment variable ${varName} is missing`);
    }
    return value;
}
