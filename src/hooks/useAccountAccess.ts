import { createContext, useContext } from 'react'
export const AccountAccessContext = createContext({ isAdmin: false })
export const useAccountAccess = () => useContext(AccountAccessContext)
