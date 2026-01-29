"use client";

import Link from "next/link";
import { useState } from "react";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import AuthLeftPanel from "./auth-sidepanel";

const contactNumberSchema = z
  .string()
  .min(1, "Contact number is required.")
  .regex(/^(\+639\d{9}|09\d{9})$/, "Use 09XXXXXXXXX or +639XXXXXXXXX.");

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    address: z.string().min(1, "Address is required."),
    email: z.string().email("Enter a valid email address."),
    contactNumber: contactNumberSchema,
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
    dob: z.string().min(1, "Date of birth is required."), // <input type="date" /> gives a string
    sex: z.enum(["male", "female"], { message: "Sex is required." }),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResidentRegister() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      email: "",
      contactNumber: "",
      password: "",
      confirm: "",
      dob: "",
      sex: undefined as unknown as "male" | "female",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // const { data, error } = await supabase.auth.signUp({
      //   email: values.email,
      //   password: values.password,
      //   options: {
      //     data: {
      //       first_name: values.firstName,
      //       last_name: values.lastName,
      //       address: values.address,
      //       contact_number: values.contactNumber,
      //       sex: values.sex,
      //       date_of_birth: values.dob,
      //       role: "resident",
      //     },
      //   },
      // });
      //
      // if (error) return setFormError(error.message);
      //
      // if (!data.session) {
      //   setSuccess("Registration successful. Please check your email to confirm your account.");
      //   return;
      // }
      //
      // window.location.href = "/dashboard";

      // TEMP while supabase is commented:
      setSuccess("Form submitted (Supabase is currently commented).");
      reset();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      {/* LEFT PANEL */}
      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="h-dvh overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-tight">Create Resident Account</h2>
            <p className="mt-2 text-base text-muted-foreground">Register to access barangay services</p>

            <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-medium">*</span> Required fields must be filled out correctly
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              {/* First + Last */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-12 text-base"
                    placeholder="John"
                    disabled={loading}
                    {...register("firstName")}
                  />
                  {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-12 text-base"
                    placeholder="Doe"
                    disabled={loading}
                    {...register("lastName")}
                  />
                  {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="h-12 text-base"
                  placeholder="Matina, Davao City"
                  disabled={loading}
                  {...register("address")}
                />
                {errors.address && <p className="text-sm text-red-600">{errors.address.message}</p>}
              </div>

              {/* Email + Contact */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    className="h-12 text-base"
                    placeholder="johndoe@example.com"
                    disabled={loading}
                    {...register("email")}
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="h-12 text-base"
                    placeholder="09123456789"
                    disabled={loading}
                    {...register("contactNumber")}
                  />
                  <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
                  {errors.contactNumber && (
                    <p className="text-sm text-red-600">{errors.contactNumber.message}</p>
                  )}
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    className="h-12 text-base"
                    placeholder="********"
                    disabled={loading}
                    {...register("password")}
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    className="h-12 text-base"
                    placeholder="********"
                    disabled={loading}
                    {...register("confirm")}
                  />
                  {errors.confirm && <p className="text-sm text-red-600">{errors.confirm.message}</p>}
                </div>
              </div>

              {/* DOB + Sex */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input type="date" className="h-12 text-base" disabled={loading} {...register("dob")} />
                  {errors.dob && <p className="text-sm text-red-600">{errors.dob.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Sex <span className="text-red-500">*</span>
                  </Label>

                  <Controller
                    control={control}
                    name="sex"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                        <SelectTrigger className="w-full! h-12! text-base">
                          <SelectValue placeholder="Please Select" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.sex && <p className="text-sm text-red-600">{errors.sex.message}</p>}
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}

              <Button className="w-full h-12 text-base bg-[#062E24] hover:bg-[#062E24]/90" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Register Account"}
              </Button>

              <p className="text-center text-base text-muted-foreground">
                Already have an account?{" "}
                <Link href="/" className="text-[#062E24] hover:underline font-medium">
                  Sign In
                </Link>
              </p>


            </form>
          </div>
        </div>
      </div>
    </div>
  );
}