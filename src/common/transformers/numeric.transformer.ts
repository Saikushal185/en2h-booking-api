import { ValueTransformer } from 'typeorm';

/**
 * Postgres `decimal`/`numeric` columns are returned as strings by the driver.
 * This transformer keeps them as JavaScript numbers on the entity so API
 * responses expose numeric prices rather than quoted strings.
 */
export class NumericTransformer implements ValueTransformer {
  to(value: number | null): number | null {
    return value;
  }

  from(value: string | null): number | null {
    return value === null ? null : parseFloat(value);
  }
}
