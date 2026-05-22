@extends('projectservice::layouts.master')

@section('content')
    <h1>Hello World</h1>

    <p>Module: {!! config('projectservice.name') !!}</p>
@endsection
