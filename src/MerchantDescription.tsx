import React from 'react';
import {suggestMerchant} from '../shared/merchants';
export function MerchantDescription({description,payees,aliases=[],accountId}:any){const suggestion=suggestMerchant(description,payees,aliases,accountId);return <><strong>{suggestion.name||description}</strong>{suggestion.name&&<><small>Suggested payee - editable before saving</small><details><summary>Original bank description</summary><span>{description}</span></details></>}</>}
