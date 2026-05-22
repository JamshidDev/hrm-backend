<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * 
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $type
 * @property string|null $message
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MessageArchive withoutTrashed()
 */
	class MessageArchive extends \Eloquent {}
}

namespace App\Models{
/**
 * 
 *
 * @property int $id
 * @property string|null $name
 * @property string $key
 * @property string|null $url
 * @property array|null $credentials
 * @property int $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereCredentials($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService whereUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|OtpService withoutTrashed()
 */
	class OtpService extends \Eloquent {}
}

namespace App\Models{
/**
 * 
 *
 * @property int $id
 * @property string $uuid
 * @property string|null $last_name
 * @property string|null $first_name
 * @property string|null $middle_name
 * @property string|null $photo
 * @property int $pin
 * @property int $phone
 * @property string|null $phone_verified_at
 * @property int $is_verified
 * @property string $password
 * @property int $status
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $organization_id
 * @property-read \Kalnoy\Nestedset\Collection<int, \Modules\Structure\Models\Organization> $organizations
 * @property-read int|null $organizations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Permission> $permissions
 * @property-read int|null $permissions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Role> $roles
 * @property-read int|null $roles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User permission($permissions, $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User role($roles, $guard = null, $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereFirstName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsVerified($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLastName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereMiddleName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereOrganizationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhoneVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhoto($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUuid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutPermission($permissions)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutRole($roles, $guard = null)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutTrashed()
 */
	class User extends \Eloquent {}
}

