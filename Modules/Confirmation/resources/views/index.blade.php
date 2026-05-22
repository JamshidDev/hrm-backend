@extends('confirmation::layouts.master')

@section('content')
    <h1>Hello World</h1>

    <p>Module: {!! config('confirmation.name') !!}</p>
@endsection
