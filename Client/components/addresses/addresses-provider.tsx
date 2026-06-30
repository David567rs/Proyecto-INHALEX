"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  createShippingAddress,
  listShippingAddresses,
  removeShippingAddress,
  updateShippingAddress,
  type ShippingAddress,
  type ShippingAddressInput,
} from "@/lib/addresses/addresses-api"
import { getAccessToken } from "@/lib/auth/token-storage"

interface AddressesContextValue {
  addresses: ShippingAddress[]
  isLoading: boolean
  createAddress: (payload: ShippingAddressInput) => Promise<void>
  updateAddress: (
    addressId: string,
    payload: Partial<ShippingAddressInput>,
  ) => Promise<void>
  removeAddress: (addressId: string) => Promise<void>
  setDefaultAddress: (addressId: string) => Promise<void>
}

const AddressesContext = createContext<AddressesContextValue | undefined>(
  undefined,
)

function requireToken(): string {
  const token = getAccessToken()
  if (!token) {
    throw new Error("Inicia sesion para administrar tus direcciones.")
  }
  return token
}

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isActive = true

    if (isAuthLoading) {
      return () => {
        isActive = false
      }
    }

    if (!user) {
      setAddresses([])
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    const token = getAccessToken()
    if (!token) {
      setAddresses([])
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsLoading(true)
    void listShippingAddresses(token)
      .then((response) => {
        if (isActive) setAddresses(response)
      })
      .catch(() => {
        if (isActive) setAddresses([])
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isAuthLoading, user])

  const createAddress = useCallback(async (payload: ShippingAddressInput) => {
    setAddresses(await createShippingAddress(payload, requireToken()))
  }, [])

  const updateAddress = useCallback(
    async (addressId: string, payload: Partial<ShippingAddressInput>) => {
      setAddresses(
        await updateShippingAddress(addressId, payload, requireToken()),
      )
    },
    [],
  )

  const removeAddress = useCallback(async (addressId: string) => {
    setAddresses(await removeShippingAddress(addressId, requireToken()))
  }, [])

  const setDefaultAddress = useCallback(
    async (addressId: string) => {
      setAddresses(
        await updateShippingAddress(
          addressId,
          { isDefault: true },
          requireToken(),
        ),
      )
    },
    [],
  )

  const value = useMemo<AddressesContextValue>(
    () => ({
      addresses,
      isLoading,
      createAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
    }),
    [
      addresses,
      createAddress,
      isLoading,
      removeAddress,
      setDefaultAddress,
      updateAddress,
    ],
  )

  return (
    <AddressesContext.Provider value={value}>
      {children}
    </AddressesContext.Provider>
  )
}

export function useAddresses(): AddressesContextValue {
  const context = useContext(AddressesContext)

  if (!context) {
    throw new Error("useAddresses must be used within AddressesProvider")
  }

  return context
}
